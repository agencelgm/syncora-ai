import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { runExternalRevenueSync, SyncError } from '../_shared/externalSync.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    const body = await safeJson(req);

    const result = await runExternalRevenueSync(base44, {
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      providers: body.providers,
      triggeredBy: 'manual',
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

async function safeJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
