import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();

    // Cette fonction est appelée par une automation programmée (rôle admin requis)
    if (caller?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const users = await base44.asServiceRole.entities.User.list();
    const profiles = await base44.asServiceRole.entities.UserProfile.list();

    let sent = 0;
    let skipped = 0;

    for (const user of users) {
      if (!user.email) { skipped++; continue; }

      const profile = profiles.find(p => p.created_by_id === user.id);
      if (profile && profile.daily_reminder_enabled === false) { skipped++; continue; }

      // Récupérer les données du jour pour cet utilisateur
      const [todayRevenues, activeObjectives, openTasks] = await Promise.all([
        base44.asServiceRole.entities.RevenueEntry.filter({ date: today, created_by_id: user.id }),
        base44.asServiceRole.entities.Objective.filter({ status: 'active', created_by_id: user.id }),
        base44.asServiceRole.entities.Task.filter({ status: 'todo', created_by_id: user.id }),
      ]);

      const totalToday = todayRevenues.reduce((s, r) => s + (r.amount_fcfa || 0), 0);
      const firstName = (profile?.full_name || user.full_name || '').split(' ')[0] || 'Champion';

      const objectivesList = activeObjectives.slice(0, 3).map(o => {
        const pct = o.target_amount_fcfa ? Math.round((o.current_amount_fcfa || 0) / o.target_amount_fcfa * 100) : 0;
        return `<li style="margin-bottom:6px;"><strong>${o.title}</strong> — ${pct}% (${(o.current_amount_fcfa || 0).toLocaleString()} / ${(o.target_amount_fcfa || 0).toLocaleString()} FCFA)</li>`;
      }).join('') || '<li style="color:#888;">Aucun objectif actif</li>';

      const subject = totalToday > 0
        ? `🔥 ${totalToday.toLocaleString()} FCFA aujourd'hui — bilan du soir`
        : `⏰ Bilan du soir : as-tu noté tes revenus du jour ?`;

      const body = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#14171F;color:#F0F2F5;padding:24px;max-width:560px;margin:0 auto;border-radius:16px;">
          <h1 style="color:#F5A623;font-size:22px;margin:0 0 8px;">Salut ${firstName} 👋</h1>
          <p style="color:#8A93A6;margin:0 0 20px;">Petite pause avant la fin de journée. Voici ton bilan.</p>

          <div style="background:#1A1E2A;border:1px solid #252A38;border-radius:12px;padding:16px;margin-bottom:16px;">
            <p style="margin:0 0 4px;color:#10B981;font-size:12px;font-weight:600;letter-spacing:0.5px;">REVENUS DU JOUR</p>
            <p style="margin:0;font-size:28px;font-weight:800;color:#fff;">${totalToday.toLocaleString()} FCFA</p>
            ${totalToday === 0 ? '<p style="margin:8px 0 0;color:#F5A623;font-size:13px;">💡 Pense à enregistrer tout revenu généré aujourd\'hui, même petit.</p>' : ''}
          </div>

          <div style="background:#1A1E2A;border:1px solid #252A38;border-radius:12px;padding:16px;margin-bottom:16px;">
            <p style="margin:0 0 10px;color:#3B82F6;font-size:12px;font-weight:600;letter-spacing:0.5px;">TES OBJECTIFS ACTIFS</p>
            <ul style="margin:0;padding-left:18px;color:#F0F2F5;font-size:14px;">${objectivesList}</ul>
          </div>

          <div style="background:#1A1E2A;border:1px solid #252A38;border-radius:12px;padding:16px;margin-bottom:20px;">
            <p style="margin:0;color:#F0F2F5;font-size:14px;">📋 <strong>${openTasks.length}</strong> tâches en attente</p>
          </div>

          <p style="color:#8A93A6;font-size:13px;line-height:1.5;margin:0 0 16px;">
            👉 Ouvre l'app, note tes revenus du jour et passe en revue tes objectifs. 2 minutes suffisent.
          </p>

          <p style="color:#555;font-size:11px;margin:20px 0 0;text-align:center;">
            Tu peux désactiver ces rappels dans Paramètres → Connexions.
          </p>
        </div>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject,
        body,
      });
      sent++;
    }

    return Response.json({ success: true, sent, skipped });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});