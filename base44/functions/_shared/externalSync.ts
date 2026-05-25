export const TARGET_SYNC_EMAIL = 'kkaderkonan@gmail.com';

const VALID_PROVIDERS = ['gohighlevel', 'chariow'];
const PROVIDER_LABELS: Record<string, string> = {
  gohighlevel: 'GoHighLevel',
  chariow: 'Chariow',
};
const PAID_STATUSES = new Set(['paid', 'succeeded', 'success', 'completed', 'settled', 'captured']);
const FCFA_CURRENCIES = new Set(['FCFA', 'XOF', 'XAF']);
const exchangeRateCache = new Map<string, { rate: number; expiresAt: number }>();

export class SyncError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'SyncError';
    this.status = status;
  }
}

type SyncProvider = 'gohighlevel' | 'chariow';

type SyncRequest = {
  periodStart?: string;
  periodEnd?: string;
  providers?: string[];
  triggeredBy?: string;
};

type ExternalRevenueRecord = {
  provider: SyncProvider;
  externalId: string;
  status: string;
  amount: number;
  currency: string;
  date: string;
  label: string;
  notes?: string;
};

type SyncStats = {
  imported: number;
  skipped: number;
  failed: number;
  totalFcfa: number;
};

type ProviderAccount = {
  id?: string;
  accountName: string;
  apiKey: string;
  locationId?: string;
};

export function getCurrentMonthPeriod(now = new Date()) {
  return {
    periodStart: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`,
    periodEnd: formatDate(now),
  };
}

export async function runExternalRevenueSync(base44: any, request: SyncRequest = {}, options: { caller?: any } = {}) {
  const caller = options.caller;
  if (caller && caller.email !== TARGET_SYNC_EMAIL && caller.role !== 'admin') {
    throw new SyncError('Cette synchronisation est limitee au compte cible configure.', 403);
  }

  const fallbackPeriod = getCurrentMonthPeriod();
  const periodStart = assertDate(request.periodStart || fallbackPeriod.periodStart, 'periodStart');
  const periodEnd = assertDate(request.periodEnd || fallbackPeriod.periodEnd, 'periodEnd');
  if (periodStart > periodEnd) {
    throw new SyncError('La date de debut doit etre avant la date de fin.', 400);
  }

  const providers = normalizeProviders(request.providers);
  const targetUser = await findTargetUser(base44);
  const providerAccounts = await loadProviderAccounts(base44, targetUser.id);
  const existingKeys = await getExistingExternalKeys(base44, targetUser.id);
  const importedAt = new Date().toISOString();
  const providerStats: Record<string, SyncStats> = {};
  const errors: string[] = [];
  const created: any[] = [];

  for (const provider of providers) {
    providerStats[provider] = { imported: 0, skipped: 0, failed: 0, totalFcfa: 0 };

    let records: ExternalRevenueRecord[] = [];
    try {
      records = await fetchProviderRecords(provider, periodStart, periodEnd, providerAccounts[provider] || []);
    } catch (error) {
      providerStats[provider].failed += 1;
      errors.push(`${PROVIDER_LABELS[provider]}: ${messageFromError(error)}`);
      continue;
    }

    for (const record of records) {
      const key = `${record.provider}:${record.externalId}`;
      if (existingKeys.has(key)) {
        providerStats[provider].skipped += 1;
        continue;
      }

      try {
        const converted = await convertToFcfa(record.amount, record.currency);
        const entry = await base44.asServiceRole.entities.RevenueEntry.create({
          amount_fcfa: converted.amountFcfa,
          date: record.date,
          source: PROVIDER_LABELS[provider],
          action_label: record.label,
          notes: record.notes || `Import ${PROVIDER_LABELS[provider]}`,
          external_provider: record.provider,
          external_id: record.externalId,
          external_status: record.status,
          original_amount: record.amount,
          original_currency: record.currency,
          exchange_rate_to_fcfa: converted.rate,
          imported_at: importedAt,
          created_by_id: targetUser.id,
        });

        created.push(entry);
        existingKeys.add(key);
        providerStats[provider].imported += 1;
        providerStats[provider].totalFcfa += converted.amountFcfa;
      } catch (error) {
        providerStats[provider].failed += 1;
        errors.push(`${PROVIDER_LABELS[provider]} ${record.externalId}: ${messageFromError(error)}`);
      }
    }
  }

  const totals = Object.values(providerStats).reduce(
    (sum, stat) => ({
      imported: sum.imported + stat.imported,
      skipped: sum.skipped + stat.skipped,
      failed: sum.failed + stat.failed,
      totalFcfa: sum.totalFcfa + stat.totalFcfa,
    }),
    { imported: 0, skipped: 0, failed: 0, totalFcfa: 0 },
  );

  const status = errors.length === 0
    ? 'success'
    : totals.imported > 0 || totals.skipped > 0
      ? 'partial'
      : 'error';

  const run = await base44.asServiceRole.entities.ExternalSyncRun.create({
    providers,
    period_start: periodStart,
    period_end: periodEnd,
    status,
    target_user_email: TARGET_SYNC_EMAIL,
    target_user_id: targetUser.id,
    total_imported: totals.imported,
    total_skipped: totals.skipped,
    total_failed: totals.failed,
    total_fcfa: Math.round(totals.totalFcfa),
    kpis: providerStats,
    errors,
    triggered_by: request.triggeredBy || 'manual',
    created_by_id: targetUser.id,
  });

  return {
    success: status !== 'error',
    status,
    run,
    providers,
    periodStart,
    periodEnd,
    totals: {
      imported: totals.imported,
      skipped: totals.skipped,
      failed: totals.failed,
      totalFcfa: Math.round(totals.totalFcfa),
    },
    errors,
    createdIds: created.map(entry => entry.id),
  };
}

async function findTargetUser(base44: any) {
  const users = await base44.asServiceRole.entities.User.list();
  const target = users.find((user: any) => String(user.email || '').toLowerCase() === TARGET_SYNC_EMAIL);
  if (!target?.id) {
    throw new SyncError(`Compte cible introuvable: ${TARGET_SYNC_EMAIL}`, 404);
  }
  return target;
}

async function getExistingExternalKeys(base44: any, userId: string) {
  const entries = await base44.asServiceRole.entities.RevenueEntry.filter({ created_by_id: userId }, '-created_date', 1000);
  return new Set(
    entries
      .filter((entry: any) => entry.external_provider && entry.external_id)
      .map((entry: any) => `${entry.external_provider}:${entry.external_id}`),
  );
}

async function loadProviderAccounts(base44: any, userId: string) {
  const byProvider: Record<string, ProviderAccount[]> = {
    gohighlevel: [],
    chariow: [],
  };

  try {
    const accounts = await base44.asServiceRole.entities.IntegrationAccount.filter({ created_by_id: userId }, '-created_date', 100);
    for (const account of accounts) {
      const provider = String(account.service || '').toLowerCase();
      if (!VALID_PROVIDERS.includes(provider) || account.is_active === false || !account.api_key) continue;
      byProvider[provider].push({
        id: account.id,
        accountName: account.account_name || PROVIDER_LABELS[provider],
        apiKey: account.api_key,
        locationId: account.location_id,
      });
    }
  } catch {
    // Les comptes connectes sont optionnels: on retombe sur les secrets serveur.
  }

  if (byProvider.gohighlevel.length === 0 && Deno.env.get('GHL_ACCESS_TOKEN')) {
    byProvider.gohighlevel.push({
      accountName: 'GoHighLevel',
      apiKey: Deno.env.get('GHL_ACCESS_TOKEN') || '',
      locationId: Deno.env.get('GHL_LOCATION_ID') || '',
    });
  }

  if (byProvider.chariow.length === 0 && Deno.env.get('CHARIOW_API_KEY')) {
    byProvider.chariow.push({
      accountName: 'Chariow',
      apiKey: Deno.env.get('CHARIOW_API_KEY') || '',
    });
  }

  return byProvider;
}

function normalizeProviders(value?: string[]): SyncProvider[] {
  const providers = Array.isArray(value) && value.length > 0
    ? value.map(provider => String(provider || '').toLowerCase().trim())
    : VALID_PROVIDERS;

  const normalized = providers.filter(provider => VALID_PROVIDERS.includes(provider)) as SyncProvider[];
  if (normalized.length === 0) {
    throw new SyncError('Aucune source de revenus valide fournie.', 400);
  }
  return Array.from(new Set(normalized));
}

async function fetchProviderRecords(provider: SyncProvider, periodStart: string, periodEnd: string, accounts: ProviderAccount[]) {
  if (!accounts.length) {
    throw new SyncError(`Aucun compte ${PROVIDER_LABELS[provider]} connecte. Ajoute-le dans Parametres > API ou configure le secret serveur.`, 404);
  }

  const allRecords: ExternalRevenueRecord[] = [];
  if (provider === 'gohighlevel') {
    for (const account of accounts) {
      allRecords.push(...await fetchGoHighLevelRecords(periodStart, periodEnd, account));
    }
    return allRecords;
  }

  for (const account of accounts) {
    allRecords.push(...await fetchChariowRecords(periodStart, periodEnd, account));
  }
  return allRecords;
}

async function fetchGoHighLevelRecords(periodStart: string, periodEnd: string, account: ProviderAccount): Promise<ExternalRevenueRecord[]> {
  if (!account.apiKey || !account.locationId) {
    throw new SyncError(`Compte GoHighLevel "${account.accountName}": token ou Location ID manquant.`, 404);
  }

  const baseUrl = Deno.env.get('GHL_API_BASE_URL') || 'https://services.leadconnectorhq.com';
  const apiVersion = Deno.env.get('GHL_API_VERSION') || '2023-02-21';
  const url = new URL('/payments/transactions', baseUrl);
  url.searchParams.set('altId', locationId);
  url.searchParams.set('altType', 'location');
  url.searchParams.set('startAt', `${periodStart}T00:00:00.000Z`);
  url.searchParams.set('endAt', `${periodEnd}T23:59:59.999Z`);
  url.searchParams.set('limit', '1000');

  const payload = await fetchJson(url.toString(), {
    headers: {
      Authorization: `Bearer ${account.apiKey}`,
      Accept: 'application/json',
      Version: apiVersion,
    },
  }, 'GoHighLevel');

  return extractList(payload)
    .map((item: any, index: number) => normalizeGoHighLevelTransaction(item, index, account))
    .filter(Boolean)
    .filter(record => isDateInsidePeriod(record!.date, periodStart, periodEnd)) as ExternalRevenueRecord[];
}

function normalizeGoHighLevelTransaction(item: any, index: number, account: ProviderAccount): ExternalRevenueRecord | null {
  const status = pickString(item, ['status', 'paymentStatus', 'transactionStatus', 'chargeStatus']).toLowerCase();
  if (status && !PAID_STATUSES.has(status)) return null;

  const amount = pickNumber(item, ['amount', 'amount.value', 'amountPaid', 'amount_paid', 'total', 'totalAmount', 'value']);
  if (!amount || amount <= 0) return null;

  const date = toDateOnly(pickString(item, ['paidAt', 'paid_at', 'createdAt', 'created_at', 'date']));
  if (!date) return null;

  const externalId = pickString(item, ['id', '_id', 'transactionId', 'paymentId', 'invoiceId', 'chargeId'])
    || `ghl-${date}-${amount}-${index}`;
  const currency = normalizeCurrency(pickString(item, ['currency', 'currencyCode', 'currency_code', 'amount.currency']) || 'XOF');
  const customer = pickString(item, ['contactName', 'customerName', 'name', 'contact']);

  return {
    provider: 'gohighlevel',
    externalId: `${account.id || account.locationId || account.accountName}:${externalId}`,
    status: status || 'paid',
    amount,
    currency,
    date,
    label: customer ? `Paiement ${customer}` : `Paiement ${account.accountName}`,
    notes: `Import GoHighLevel (${account.accountName}) - transaction ${externalId}`,
  };
}

async function fetchChariowRecords(periodStart: string, periodEnd: string, account: ProviderAccount): Promise<ExternalRevenueRecord[]> {
  if (!account.apiKey) {
    throw new SyncError(`Compte Chariow "${account.accountName}": cle API manquante.`, 404);
  }

  const baseUrl = Deno.env.get('CHARIOW_API_BASE_URL') || 'https://api.chariow.com';
  const sales: any[] = [];

  for (const status of ['completed', 'settled']) {
    let cursor = '';
    do {
      const url = new URL('/v1/sales', baseUrl);
      url.searchParams.set('start_date', periodStart);
      url.searchParams.set('end_date', periodEnd);
      url.searchParams.set('status', status);
      url.searchParams.set('per_page', '100');
      if (cursor) url.searchParams.set('cursor', cursor);

      const payload = await fetchJson(url.toString(), {
        headers: {
          Authorization: `Bearer ${account.apiKey}`,
          Accept: 'application/json',
        },
      }, 'Chariow');

      sales.push(...extractList(payload));
      cursor = payload?.pagination?.has_more ? String(payload?.pagination?.next_cursor || '') : '';
    } while (cursor);
  }

  return sales
    .map((item: any, index: number) => normalizeChariowSale(item, index, periodEnd, account))
    .filter(Boolean)
    .filter(record => isDateInsidePeriod(record!.date, periodStart, periodEnd)) as ExternalRevenueRecord[];
}

function normalizeChariowSale(item: any, index: number, fallbackDate: string, account: ProviderAccount): ExternalRevenueRecord | null {
  const status = pickString(item, ['status', 'payment_status', 'paymentStatus']).toLowerCase();
  if (status && !new Set(['completed', 'settled']).has(status)) return null;

  const amount = pickNumber(item, ['amount', 'amount.value', 'payment.amount', 'payment.amount.value', 'total', 'total_amount', 'amount_paid', 'paid_amount', 'net_amount']);
  if (!amount || amount <= 0) return null;

  const date = toDateOnly(pickString(item, ['settled_at', 'settledAt', 'completed_at', 'completedAt', 'paid_at', 'paidAt', 'created_at', 'createdAt', 'date'])) || fallbackDate;
  if (!date) return null;

  const externalId = pickString(item, ['id', '_id', 'uuid', 'sale_id', 'saleId', 'reference'])
    || `chariow-${date}-${amount}-${index}`;
  const currency = normalizeCurrency(pickString(item, ['currency', 'currency_code', 'currencyCode', 'amount.currency', 'payment.amount.currency', 'original_amount.currency']) || 'XOF');
  const product = pickString(item, ['product.name', 'product_name', 'productName', 'offer_name', 'offerName', 'title', 'name']);

  return {
    provider: 'chariow',
    externalId: `${account.id || account.accountName}:${externalId}`,
    status: status || 'completed',
    amount,
    currency,
    date,
    label: product ? `Vente ${product}` : `Vente ${account.accountName}`,
    notes: `Import Chariow (${account.accountName}) - vente ${externalId}`,
  };
}

async function convertToFcfa(amount: number, currency: string) {
  const normalizedCurrency = normalizeCurrency(currency);
  if (FCFA_CURRENCIES.has(normalizedCurrency)) {
    return { amountFcfa: Math.round(amount), rate: 1 };
  }

  const today = formatDate(new Date());
  const cacheKey = `${normalizedCurrency}:${today}`;
  const cached = exchangeRateCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { amountFcfa: Math.round(amount * cached.rate), rate: cached.rate };
  }

  const payload = await fetchJson(`https://open.er-api.com/v6/latest/${encodeURIComponent(normalizedCurrency)}`, {
    headers: { Accept: 'application/json' },
  }, 'ExchangeRate-API');

  const rate = Number(payload?.rates?.XOF);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new SyncError(`Taux XOF indisponible pour ${normalizedCurrency}.`, 502);
  }

  exchangeRateCache.set(cacheKey, { rate, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
  return { amountFcfa: Math.round(amount * rate), rate };
}

async function fetchJson(url: string, init: RequestInit, providerLabel: string) {
  const response = await fetch(url, init);
  const text = await response.text();
  const payload = safeJson(text);

  if (!response.ok) {
    const details = typeof payload?.message === 'string'
      ? payload.message
      : text.slice(0, 280);
    const hint = response.status === 404 ? notFoundHint(providerLabel) : '';
    throw new SyncError(`${providerLabel} a refuse la requete (${response.status}). ${details}${hint}`, response.status);
  }

  return payload;
}

function notFoundHint(providerLabel: string) {
  if (providerLabel === 'GoHighLevel') {
    return ' Verifie que le token est un token API 2.0/Sub-Account, que le Location ID est correct et que les scopes Payments sont actifs.';
  }
  if (providerLabel === 'Chariow') {
    return ' Verifie que la cle API Chariow est active et que le compte a acces a /v1/sales.';
  }
  return '';
}

function extractList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  for (const key of ['transactions', 'sales', 'data', 'items', 'records', 'results']) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      const nested = extractList(value);
      if (nested.length > 0) return nested;
    }
  }

  return [];
}

function pickString(item: any, keys: string[]) {
  for (const key of keys) {
    const value = readPath(item, key);
    if (value == null) continue;
    if (typeof value === 'object') {
      if (typeof value.name === 'string') return value.name;
      if (typeof value.email === 'string') return value.email;
      if (typeof value.currency === 'string') return value.currency;
      continue;
    }
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function pickNumber(item: any, keys: string[]) {
  for (const key of keys) {
    const value = readPath(item, key);
    if (value == null || value === '') continue;
    if (typeof value === 'object' && value.value != null) {
      const nestedNumber = Number(String(value.value).replace(/[^\d.-]/g, ''));
      if (Number.isFinite(nestedNumber)) return nestedNumber;
    }
    const numberValue = typeof value === 'number'
      ? value
      : Number(String(value).replace(/[^\d.-]/g, ''));
    if (Number.isFinite(numberValue)) return numberValue;
  }
  return 0;
}

function readPath(item: any, path: string) {
  return path.split('.').reduce((value, key) => value?.[key], item);
}

function normalizeCurrency(value: string) {
  const currency = String(value || 'XOF').trim().toUpperCase();
  return currency === 'CFA' ? 'XOF' : currency;
}

function isDateInsidePeriod(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function assertDate(value: string, label: string) {
  const date = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new SyncError(`${label} doit etre au format YYYY-MM-DD.`, 400);
  }
  return date;
}

function toDateOnly(value: string) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return formatDate(date);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function safeJson(text: string) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
