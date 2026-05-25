import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Plus, X, CheckCircle2, Link2, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import TaskPickerDrawer from '@/components/objectives/TaskPickerDrawer';
import { getCurrentUser } from '@/hooks/useCurrentUser';

export default function QuickRevenueEntry({ onAdded }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [taskId, setTaskId] = useState('');
  const [actionLabel, setActionLabel] = useState('');
  const [tasks, setTasks] = useState([]);
  const [saved, setSaved] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    getCurrentUser().then(user => {
      if (!user?.id) return [];
      return base44.entities.Task.filter({ status: 'done', created_by_id: user.id }, '-completed_at', 30);
    }).then(data => {
      if (!cancelled) setTasks(data || []);
    });

    return () => { cancelled = true; };
  }, [open]);

  const submit = async () => {
    if (!amount) return;
    const payload = {
      amount_fcfa: Number(amount),
      date: format(new Date(), 'yyyy-MM-dd'),
      source: source || 'Non précisé',
      action_label: actionLabel,
    };
    if (taskId) payload.task_id = taskId;
    await base44.entities.RevenueEntry.create(payload);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setOpen(false);
      setAmount('');
      setSource('');
      setTaskId('');
      setActionLabel('');
      onAdded?.();
    }, 1200);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-success/10 border border-success/30 text-success rounded-2xl px-4 py-3 text-sm font-medium w-full"
      >
        <Plus size={16} />
        <span>Ajouter un revenu d'aujourd'hui</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-end"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-md mx-auto bg-card rounded-t-3xl p-6 border-t border-border pb-8"
              onClick={e => e.stopPropagation()}
            >
              {saved ? (
                <div className="flex flex-col items-center py-6 gap-3">
                  <CheckCircle2 size={40} className="text-success" />
                  <p className="font-bold text-foreground">Revenu enregistré !</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign size={18} className="text-success" />
                      <h3 className="font-bold text-foreground">Revenu du jour</h3>
                    </div>
                    <button onClick={() => setOpen(false)} className="text-muted-foreground"><X size={20} /></button>
                  </div>

                  <input
                    type="number"
                    placeholder="Montant (FCFA)"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    autoFocus
                    className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-lg font-bold outline-none border border-transparent focus:border-success/50 mb-3"
                  />
                  <input
                    type="text"
                    placeholder="Source (client, projet, formation...)"
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none border border-transparent focus:border-success/50 mb-2"
                  />

                  <label className="text-xs text-muted-foreground mb-1 mt-1 flex items-center gap-1"><Link2 size={12} /> Action qui a généré ce revenu</label>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none border border-transparent focus:border-success/50 mb-2 flex items-center justify-between text-left min-h-[44px]"
                  >
                    <span className={taskId ? 'text-foreground truncate pr-2' : 'text-muted-foreground'}>
                      {taskId
                        ? (tasks.find(t => t.id === taskId)?.title || 'Tâche liée')
                        : '— Aucune tâche liée —'}
                    </span>
                    <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                  </button>
                  <TaskPickerDrawer
                    open={pickerOpen}
                    onClose={() => setPickerOpen(false)}
                    tasks={tasks}
                    selectedId={taskId}
                    onSelect={setTaskId}
                  />
                  {!taskId && (
                    <input
                      type="text"
                      placeholder="Ou décris l'action courte"
                      value={actionLabel}
                      onChange={e => setActionLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submit()}
                      className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none border border-transparent focus:border-success/50 mb-4"
                    />
                  )}
                  <button
                    onClick={submit}
                    disabled={!amount}
                    className="w-full bg-success text-white rounded-xl py-3 text-sm font-bold disabled:opacity-50"
                  >
                    Enregistrer
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
