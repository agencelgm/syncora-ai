import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { runExternalRevenueSync, SyncError } from '../_shared/externalSync.ts';

const MONTHS: Record<string, number> = {
  janvier: 0,
  fevrier: 1,
  février: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  aout: 7,
  août: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  decembre: 11,
  décembre: 11,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller?.id) {
      return Response.json({ type: 'error', message: 'Authentification requise.' }, { status: 401 });
    }

    const body = await safeJson(req);
    if (body.confirmActionId) {
      const result = await executeConfirmedAction(base44, caller, String(body.confirmActionId));
      return Response.json(result);
    }

    const message = String(body.message || '').trim();
    if (!message) {
      return Response.json({ type: 'unknown', message: 'Dis-moi ce que tu veux faire, et je prepare la bonne action.' });
    }

    const intent = await classifyMessage(base44, message);
    if (intent.type === 'answer_summary') {
      const answer = await buildRevenueSummary(base44, caller, intent.payload);
      return Response.json({ type: 'answer', message: answer });
    }

    if (intent.type === 'unknown') {
      return Response.json({
        type: 'unknown',
        message: "Je peux creer une tache, creer un objectif, synchroniser GoHighLevel/Chariow, ou resumer tes resultats. Reformule-moi l'action voulue et je prepare la confirmation.",
      });
    }

    const action = await base44.entities.AgentAction.create({
      type: intent.type,
      status: 'pending',
      summary: intent.summary,
      payload: intent.payload,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });

    return Response.json({
      type: 'confirmation_required',
      actionId: action.id,
      actionType: action.type,
      summary: action.summary,
      payload: action.payload,
      message: `Je vais faire ceci : ${action.summary}`,
    });
  } catch (error) {
    const status = error instanceof SyncError ? error.status : 500;
    return Response.json({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    }, { status });
  }
});

async function executeConfirmedAction(base44: any, caller: any, actionId: string) {
  const action = await findAction(base44, caller, actionId);
  if (!action) {
    return { type: 'error', message: 'Action introuvable ou deja expiree.' };
  }
  if (action.status !== 'pending') {
    return { type: 'already_handled', message: 'Cette action a deja ete traitee.', action };
  }
  if (action.expires_at && new Date(action.expires_at).getTime() < Date.now()) {
    await base44.entities.AgentAction.update(action.id, { status: 'cancelled', error: 'Action expiree.' });
    return { type: 'error', message: 'Cette confirmation a expire. Relance la commande.' };
  }

  try {
    let result: any;
    if (action.type === 'create_task') {
      const task = await base44.entities.Task.create({
        title: cleanTitle(action.payload?.title) || 'Nouvelle tache',
        description: action.payload?.description || '',
        status: 'todo',
        priority: action.payload?.priority || 'medium',
        due_date: action.payload?.due_date || undefined,
        due_time: action.payload?.due_time || undefined,
        estimated_value_fcfa: Number(action.payload?.estimated_value_fcfa) || 0,
        ai_priority_score: Number(action.payload?.ai_priority_score) || 60,
        ai_coaching_note: action.payload?.ai_coaching_note || '',
        tags: Array.isArray(action.payload?.tags) ? action.payload.tags : [],
        source: 'ai_chat',
      });
      result = { taskId: task.id, title: task.title };
    } else if (action.type === 'create_objective') {
      const objective = await base44.entities.Objective.create({
        title: cleanTitle(action.payload?.title) || 'Nouvel objectif',
        description: action.payload?.description || '',
        target_amount_fcfa: Number(action.payload?.target_amount_fcfa) || 0,
        current_amount_fcfa: 0,
        start_date: action.payload?.start_date || today(),
        target_date: action.payload?.target_date || undefined,
        status: 'active',
        category: action.payload?.category || 'financial',
        ai_strategy: action.payload?.ai_strategy || '',
      });
      result = { objectiveId: objective.id, title: objective.title };
    } else if (action.type === 'sync_external_results') {
      result = await runExternalRevenueSync(base44, {
        periodStart: action.payload?.periodStart,
        periodEnd: action.payload?.periodEnd,
        providers: action.payload?.providers,
        triggeredBy: 'agent',
      }, { caller });
    } else {
      throw new Error('Type d action inconnu.');
    }

    await base44.entities.AgentAction.update(action.id, { status: 'executed', result });
    return {
      type: 'executed',
      actionType: action.type,
      actionId: action.id,
      result,
      message: successMessage(action.type, result),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await base44.entities.AgentAction.update(action.id, { status: 'failed', error: message });
    return { type: 'error', actionId: action.id, actionType: action.type, message };
  }
}

async function findAction(base44: any, caller: any, actionId: string) {
  const actions = await base44.entities.AgentAction.filter({ id: actionId, created_by_id: caller.id }, '-created_date', 1);
  if (actions[0]) return actions[0];
  const fallback = await base44.entities.AgentAction.filter({ created_by_id: caller.id }, '-created_date', 50);
  return fallback.find((action: any) => action.id === actionId);
}

async function classifyMessage(base44: any, message: string) {
  const lower = normalizeText(message);
  const period = resolvePeriod(lower);
  const providers = resolveProviders(lower);

  if (isSyncIntent(lower)) {
    const label = providers.map(providerLabel).join(' et ');
    return {
      type: 'sync_external_results',
      summary: `synchroniser les revenus ${label} du ${period.periodStart} au ${period.periodEnd}`,
      payload: { ...period, providers },
    };
  }

  if (isTaskIntent(lower)) {
    const payload = extractTaskPayload(message);
    return {
      type: 'create_task',
      summary: `creer la tache "${payload.title}"${payload.due_date ? ` pour le ${payload.due_date}` : ''}${payload.due_time ? ` a ${payload.due_time}` : ''}`,
      payload,
    };
  }

  if (isObjectiveIntent(lower)) {
    const payload = extractObjectivePayload(message);
    return {
      type: 'create_objective',
      summary: `creer l'objectif "${payload.title}"${payload.target_amount_fcfa ? ` (${payload.target_amount_fcfa.toLocaleString()} FCFA)` : ''}`,
      payload,
    };
  }

  if (isSummaryIntent(lower)) {
    return {
      type: 'answer_summary',
      summary: 'resumer les resultats',
      payload: { ...period, providers },
    };
  }

  return classifyWithLlm(base44, message, period, providers);
}

async function classifyWithLlm(base44: any, message: string, period: any, providers: string[]) {
  try {
    const rawResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Classe cette commande en francais sans executer d'action.

Commande: "${message}"

Intentions possibles:
- create_task: creer une tache actionable.
- create_objective: creer un objectif.
- sync_external_results: importer/synchroniser des revenus GoHighLevel ou Chariow.
- answer_summary: expliquer les resultats deja presents.
- unknown: autre demande.

Retourne uniquement du JSON.`,
      response_json_schema: {
        type: 'object',
        properties: {
          intent: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string' },
          target_amount_fcfa: { type: 'number' },
        },
      },
    });

    const result = parseObject(rawResult);
    const intent = typeof result?.intent === 'string' ? result.intent : 'unknown';
    if (intent === 'create_task') {
      const payload = {
        ...extractTaskPayload(message),
        title: cleanTitle(result.title) || extractTaskPayload(message).title,
        description: result.description || '',
        priority: normalizePriority(result.priority),
      };
      return { type: 'create_task', summary: `creer la tache "${payload.title}"`, payload };
    }
    if (intent === 'create_objective') {
      const payload = {
        ...extractObjectivePayload(message),
        title: cleanTitle(result.title) || extractObjectivePayload(message).title,
        description: result.description || '',
        target_amount_fcfa: Number(result.target_amount_fcfa) || extractObjectivePayload(message).target_amount_fcfa,
      };
      return { type: 'create_objective', summary: `creer l'objectif "${payload.title}"`, payload };
    }
    if (intent === 'sync_external_results') {
      return {
        type: 'sync_external_results',
        summary: `synchroniser les revenus ${providers.map(providerLabel).join(' et ')} du ${period.periodStart} au ${period.periodEnd}`,
        payload: { ...period, providers },
      };
    }
    if (intent === 'answer_summary') {
      return { type: 'answer_summary', summary: 'resumer les resultats', payload: { ...period, providers } };
    }
  } catch {
    // Le fallback volontaire est "unknown" pour eviter de creer des taches par erreur.
  }

  return { type: 'unknown', summary: 'commande inconnue', payload: {} };
}

async function buildRevenueSummary(base44: any, caller: any, payload: any) {
  const entries = await base44.entities.RevenueEntry.filter({ created_by_id: caller.id }, '-date', 500);
  const providers = new Set(payload.providers || ['gohighlevel', 'chariow']);
  const periodEntries = entries.filter((entry: any) => {
    const provider = String(entry.external_provider || '').toLowerCase();
    const date = String(entry.date || '');
    return date >= payload.periodStart && date <= payload.periodEnd
      && (!provider || providers.has(provider));
  });

  const total = periodEntries.reduce((sum: number, entry: any) => sum + (Number(entry.amount_fcfa) || 0), 0);
  const bySource: Record<string, { count: number; total: number }> = {};
  for (const entry of periodEntries) {
    const source = entry.source || 'Manuel';
    bySource[source] ||= { count: 0, total: 0 };
    bySource[source].count += 1;
    bySource[source].total += Number(entry.amount_fcfa) || 0;
  }

  if (periodEntries.length === 0) {
    return `Je n'ai pas encore de revenus importes entre le ${payload.periodStart} et le ${payload.periodEnd}. Tu peux me demander de synchroniser GoHighLevel ou Chariow avant le resume.`;
  }

  const lines = Object.entries(bySource)
    .map(([source, stat]) => `- ${source}: ${Math.round(stat.total).toLocaleString()} FCFA (${stat.count} entree${stat.count > 1 ? 's' : ''})`)
    .join('\n');

  return `Resultats du ${payload.periodStart} au ${payload.periodEnd}: **${Math.round(total).toLocaleString()} FCFA**.\n\n${lines}`;
}

function isSyncIntent(text: string) {
  return /(va chercher|cherche|recupere|récupère|synchronise|sync|importe|mets a jour|met a jour)/.test(text)
    && /(gohighlevel|ghl|chariow|resultat|résultat|revenu|paiement|vente|kpi)/.test(text);
}

function isTaskIntent(text: string) {
  return /(cree|crée|creer|créer|ajoute|ajouter)/.test(text) && /(tache|tâche|todo|action)/.test(text);
}

function isObjectiveIntent(text: string) {
  return /(cree|crée|creer|créer|ajoute|ajouter)/.test(text) && /objectif/.test(text);
}

function isSummaryIntent(text: string) {
  return /(quels|quel|resume|résume|bilan|resultats|résultats|revenus|combien)/.test(text)
    && /(resultat|résultat|revenu|vente|mai|juin|mois|gohighlevel|ghl|chariow)/.test(text);
}

function resolveProviders(text: string) {
  const providers: string[] = [];
  if (/(gohighlevel|ghl)/.test(text)) providers.push('gohighlevel');
  if (/chariow/.test(text)) providers.push('chariow');
  return providers.length > 0 ? providers : ['gohighlevel', 'chariow'];
}

function resolvePeriod(text: string, now = new Date()) {
  const monthEntry = Object.entries(MONTHS).find(([name]) => text.includes(name));
  const yearMatch = text.match(/\b(20\d{2})\b/);
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  if (monthEntry) {
    const monthIndex = monthEntry[1];
    const year = yearMatch ? Number(yearMatch[1]) : currentYear;
    const periodStart = formatDate(new Date(Date.UTC(year, monthIndex, 1)));
    const isCurrentMonth = year === currentYear && monthIndex === currentMonth;
    const periodEnd = isCurrentMonth
      ? formatDate(now)
      : formatDate(new Date(Date.UTC(year, monthIndex + 1, 0)));
    return { periodStart, periodEnd };
  }

  if (/aujourd/.test(text)) {
    const date = formatDate(now);
    return { periodStart: date, periodEnd: date };
  }

  return {
    periodStart: formatDate(new Date(Date.UTC(currentYear, currentMonth, 1))),
    periodEnd: formatDate(now),
  };
}

function extractTaskPayload(message: string) {
  const lower = normalizeText(message);
  const dueTime = extractTime(lower);
  const dueDate = lower.includes('demain') ? formatDate(addDays(new Date(), 1)) : undefined;
  const title = cleanTitle(
    message
      .replace(/cr[ée]e?r?\s*(une|un)?\s*(nouvelle?\s*)?(t[aâ]che|todo|action)?/i, '')
      .replace(/demain/i, '')
      .replace(/\b\d{1,2}[:h]\d{0,2}\b/i, ''),
  ) || 'Nouvelle tache';

  return {
    title,
    description: '',
    priority: normalizePriority(lower),
    due_date: dueDate,
    due_time: dueTime,
    estimated_value_fcfa: 0,
    ai_priority_score: 60,
    ai_coaching_note: 'Cree depuis le Coach IA apres confirmation.',
    tags: ['coach_ia'],
  };
}

function extractObjectivePayload(message: string) {
  const lower = normalizeText(message);
  const amount = extractAmount(lower);
  const period = resolvePeriod(lower);
  const title = cleanTitle(
    message
      .replace(/cr[ée]e?r?\s*(un|une)?\s*objectif/i, '')
      .replace(/\d[\d\s.,]*(m|k|million|millions)?\s*(fcfa|xof|cfa)?/i, ''),
  ) || 'Nouvel objectif';

  return {
    title,
    description: '',
    target_amount_fcfa: amount,
    start_date: today(),
    target_date: period.periodEnd,
    category: 'financial',
    ai_strategy: 'Objectif cree depuis le Coach IA apres confirmation.',
  };
}

function extractAmount(text: string) {
  const match = text.replace(/\s+/g, '').match(/(\d+(?:[.,]\d+)?)(m|million|millions|k)?/);
  if (!match) return 0;
  const base = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(base)) return 0;
  const unit = match[2];
  if (unit === 'm' || unit === 'million' || unit === 'millions') return Math.round(base * 1000000);
  if (unit === 'k') return Math.round(base * 1000);
  return Math.round(base);
}

function extractTime(text: string) {
  const match = text.match(/\b(\d{1,2})(?::(\d{2})|h(\d{2})?)\b/);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2] || match[3] || 0);
  if (hour > 23 || minute > 59) return undefined;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function normalizePriority(value: string) {
  const text = normalizeText(value || '');
  if (/critique|urgent|bloquant/.test(text)) return 'critical';
  if (/haute|important/.test(text)) return 'high';
  if (/faible|basse/.test(text)) return 'low';
  return 'medium';
}

function successMessage(actionType: string, result: any) {
  if (actionType === 'create_task') return `C'est fait: la tache "${result.title}" a ete creee.`;
  if (actionType === 'create_objective') return `C'est fait: l'objectif "${result.title}" a ete cree.`;
  if (actionType === 'sync_external_results') {
    const total = Number(result?.totals?.totalFcfa) || 0;
    const imported = Number(result?.totals?.imported) || 0;
    const skipped = Number(result?.totals?.skipped) || 0;
    return `Synchronisation terminee: ${imported} revenu${imported > 1 ? 's' : ''} importe${imported > 1 ? 's' : ''}, ${skipped} deja present${skipped > 1 ? 's' : ''}, total ${Math.round(total).toLocaleString()} FCFA.`;
  }
  return 'Action executee.';
}

function providerLabel(provider: string) {
  return provider === 'gohighlevel' ? 'GoHighLevel' : 'Chariow';
}

function cleanTitle(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
}

function normalizeText(value: string) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function today() {
  return formatDate(new Date());
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseObject(value: any) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function safeJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
