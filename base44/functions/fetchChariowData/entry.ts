import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const accountId = body?.account_id;

    if (!accountId) {
      return Response.json({ error: 'account_id required' }, { status: 400 });
    }

    const account = await base44.entities.IntegrationAccount.filter({ id: accountId, created_by_id: user.id }, '-created_date', 1);
    if (!account[0]) {
      return Response.json({ error: 'Account not found' }, { status: 404 });
    }

    const accData = account[0];
    if (accData.service !== 'chariow') {
      return Response.json({ error: 'Invalid service' }, { status: 400 });
    }

    // Récupère les transactions de Chariow
    const chariowResponse = await fetch('https://api.chariow.com/v1/transactions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accData.api_key}`,
        'Content-Type': 'application/json',
      },
    });

    if (!chariowResponse.ok) {
      return Response.json({ error: 'Failed to fetch Chariow data' }, { status: 400 });
    }

    const transactions = await chariowResponse.json();

    return Response.json({
      source: 'chariow',
      account_name: accData.account_name,
      data: transactions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});