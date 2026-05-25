import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getCurrentUser } from '@/hooks/useCurrentUser';

export default function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const deleteAccount = async () => {
    setLoading(true);
    setError('');
    const user = await getCurrentUser();
    if (!user?.id) {
      setError("Impossible d'identifier le compte connecte.");
      setLoading(false);
      return;
    }
    const scope = { created_by_id: user.id };
    try {
      // Supprime uniquement les données du compte connecté.
      const [tasks, revenues, objectives, journals, chats, profiles, syncRuns, agentActions] = await Promise.all([
        base44.entities.Task.filter(scope, '-created_date', 500),
        base44.entities.RevenueEntry.filter(scope, '-created_date', 500),
        base44.entities.Objective.filter(scope, '-created_date', 100),
        base44.entities.JournalEntry.filter(scope, '-created_date', 500),
        base44.entities.ChatMessage.filter(scope, '-created_date', 500),
        base44.entities.UserProfile.filter(scope, '-created_date', 10),
        base44.entities.ExternalSyncRun.filter(scope, '-created_date', 100),
        base44.entities.AgentAction.filter(scope, '-created_date', 100),
      ]);
      const all = [
        ...tasks.map(t => base44.entities.Task.delete(t.id)),
        ...revenues.map(r => base44.entities.RevenueEntry.delete(r.id)),
        ...objectives.map(o => base44.entities.Objective.delete(o.id)),
        ...journals.map(j => base44.entities.JournalEntry.delete(j.id)),
        ...chats.map(c => base44.entities.ChatMessage.delete(c.id)),
        ...profiles.map(p => base44.entities.UserProfile.delete(p.id)),
        ...syncRuns.map(s => base44.entities.ExternalSyncRun.delete(s.id)),
        ...agentActions.map(a => base44.entities.AgentAction.delete(a.id)),
      ];
      await Promise.all(all);
      await base44.auth.logout();
    } catch (err) {
      setError("Impossible de supprimer le compte pour l'instant. Reessaie dans quelques instants.");
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-card border border-destructive/30 rounded-2xl p-4 mt-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 bg-destructive/10 rounded-xl flex items-center justify-center">
            <Trash2 size={18} className="text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Supprimer mon compte</p>
            <p className="text-xs text-muted-foreground">Toutes tes données seront effacées définitivement</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="w-full bg-destructive/10 border border-destructive/30 text-destructive rounded-xl py-2.5 text-sm font-semibold"
        >
          Supprimer mon compte
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-end"
            onClick={() => !loading && setOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-md mx-auto bg-card rounded-t-3xl p-6 border-t border-border pb-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-destructive" />
                  <h3 className="font-bold text-foreground">Confirmation</h3>
                </div>
                {!loading && (
                  <button onClick={() => setOpen(false)} className="text-muted-foreground"><X size={20} /></button>
                )}
              </div>

              <p className="text-sm text-foreground/90 mb-2">
                Cette action est <span className="text-destructive font-bold">irréversible</span>. Toutes tes tâches, revenus, objectifs et conversations seront supprimés.
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Tape <span className="text-destructive font-bold">SUPPRIMER</span> pour confirmer :
              </p>

              <input
                type="text"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="SUPPRIMER"
                disabled={loading}
                className="w-full bg-muted rounded-xl px-4 py-3 text-foreground text-sm outline-none border border-transparent focus:border-destructive/50 mb-4"
              />

              {error && (
                <p className="text-xs text-destructive mb-3">{error}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="flex-1 bg-muted text-muted-foreground rounded-xl py-3 text-sm font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={confirm !== 'SUPPRIMER' || loading}
                  className="flex-1 bg-destructive text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
