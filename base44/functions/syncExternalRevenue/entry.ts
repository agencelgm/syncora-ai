import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { periodStart, periodEnd, providers = ['gohighlevel', 'chariow'] } = body;

    if (!periodStart || !periodEnd) {
      return Response.json({ success: false, error: 'periodStart and periodEnd are required' }, { status: 400 });
    }

    // Récupère les comptes d'intégration de l'utilisateur
    const allAccounts = await base44.entities.IntegrationAccount.filter({ created_by_id: user.id, is_active: true }, '-created_date', 50);

    const errors = [];
    let totalImported = 0;
    let totalSkipped = 0;
    let totalFcfa = 0;

    for (const account of allAccounts) {
      if (!providers.includes(account.service)) continue;

      try {
        if (account.service === 'gohighlevel') {
          const result = await syncGHL(base44, user, account, periodStart, periodEnd);
          totalImported += result.imported;
          totalSkipped += result.skipped;
          totalFcfa += result.fcfa;
        } else if (account.service === 'chariow') {
          const result = await syncChariow(base44, user, account, periodStart, periodEnd);
          totalImported += result.imported;
          totalSkipped += result.skipped;
          totalFcfa += result.fcfa;
        }
      } catch (err) {
        errors.push(`[${account.account_name}] ${err.message}`);
      }
    }

    const status = errors.length === 0 ? 'success' : (totalImported > 0 ? 'partial' : 'error');

    // Enregistre le run
    await base44.entities.ExternalSyncRun.create({
      target_user_email: user.email,
      status,
      period_start: periodStart,
      period_end: periodEnd,
      total_fcfa: totalFcfa,
      total_imported: totalImported,
      total_skipped: totalSkipped,
      errors,
    });

    return Response.json({
      success: status !== 'error',
      status,
      totals: { imported: totalImported, skipped: totalSkipped, fcfa: totalFcfa },
      errors,
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});

async function syncGHL(base44, user, account, periodStart, periodEnd) {
  const url = `https://services.leadconnectorhq.com/payments/transactions?startAt=${periodStart}&endAt=${periodEnd}&limit=100${account.location_id ? `&locationId=${account.location_id}` : ''}`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${account.api_key}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const transactions = data.data?.list || data.transactions || data.data || [];

  let imported = 0;
  let skipped = 0;
  let fcfa = 0;

  for (const tx of transactions) {
    if (tx.status !== 'paid' && tx.status !== 'succeeded') continue;

    const externalId = `ghl_${tx.id || tx._id}`;
    const existing = await base44.entities.RevenueEntry.filter({ source: externalId, created_by_id: user.id }, '-created_date', 1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    const amountFcfa = Math.round((tx.amount || 0) * (tx.currency === 'usd' ? 600 : tx.currency === 'eur' ? 655 : 1));

    await base44.entities.RevenueEntry.create({
      amount_fcfa: amountFcfa,
      date: (tx.doneAt || tx.createdAt || periodStart).slice(0, 10),
      source: externalId,
      action_label: `GHL – ${account.account_name}: ${tx.entityTitle || tx.description || tx.id}`,
      notes: `Importé automatiquement depuis GoHighLevel`,
    });

    imported++;
    fcfa += amountFcfa;
  }

  return { imported, skipped, fcfa };
}

async function syncChariow(base44, user, account, periodStart, periodEnd) {
  const res = await fetch(`https://api.chariow.com/v1/transactions?start_date=${periodStart}&end_date=${periodEnd}`, {
    headers: {
      'Authorization': `Bearer ${account.api_key}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chariow API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const transactions = data.data || data.transactions || data || [];

  let imported = 0;
  let skipped = 0;
  let fcfa = 0;

  for (const tx of transactions) {
    if (tx.status !== 'paid' && tx.status !== 'completed') continue;

    const externalId = `chariow_${tx.id}`;
    const existing = await base44.entities.RevenueEntry.filter({ source: externalId, created_by_id: user.id }, '-created_date', 1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    const amountFcfa = Math.round(tx.amount_fcfa || tx.amount || 0);

    await base44.entities.RevenueEntry.create({
      amount_fcfa: amountFcfa,
      date: (tx.paid_at || tx.created_at || periodStart).slice(0, 10),
      source: externalId,
      action_label: `Chariow – ${account.account_name}: ${tx.description || tx.id}`,
      notes: `Importé automatiquement depuis Chariow`,
    });

    imported++;
    fcfa += amountFcfa;
  }

  return { imported, skipped, fcfa };
}