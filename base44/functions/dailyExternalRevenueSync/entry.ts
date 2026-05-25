import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { getCurrentMonthPeriod, runExternalRevenueSync, SyncError } from '../_shared/externalSync.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();

    if (caller?.role !== 'admin') {
      return Response.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const period = getCurrentMonthPeriod();
    const result = await runExternalRevenueSync(base44, {
      ...period,
      providers: ['gohighlevel', 'chariow'],
      triggeredBy: 'daily',
    }, { caller });

    return Response.json(result);
  } catch (error) {
    const status = error instanceof SyncError ? error.status : 500;
    return Response.json({
      success: false,
      message: error instanceof Error ? error.message : String(error),
      error: error instanceof Error ? error.message : String(error),
    }, { status });
  }
});
