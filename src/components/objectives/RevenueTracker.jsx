import { useState, useEffect } from 'react';
import { Plus, Trash2, Link2, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import TaskPickerDrawer from '@/components/objectives/TaskPickerDrawer';

export default function RevenueTracker({ revenues, onRefresh }) {
  const [form, setForm] = useState({ amount_fcfa: '', date: format(new Date(), 'yyyy-MM-dd'), source: '', task_id: '', action_label: '' });
  const [adding, setAdding] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (adding) base44.entities.Task.filter({ status: 'done' }, '-completed_at', 50).then(setTasks);
  }, [adding]);

  const add = async () => {
    if (!form.amount_fcfa) return;
    const payload = { ...form, amount_fcfa: Number(form.amount_fcfa) };
    if (!payload.task_id) delete payload.task_id;
    await base44.entities.RevenueEntry.create(payload);
    setForm({ amount_fcfa: '', date: format(new Date(), 'yyyy-MM-dd'), source: '', task_id: '', action_label: '' });
    setAdding(false);
    onRefresh();
  };

  const remove = async (id) => {
    await base44.entities.RevenueEntry.delete(id);
    onRefresh();
  };

  const taskLabel = (r) => {
    if (r.task_id) {
      const t = tasks.find(x => x.id === r.task_id);
      if (t) return t.title;
    }
    return r.action_label;
  };

  return (
    <div>
      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 bg-success/10 border border-success/30 text-success rounded-2xl py-3 text-sm font-medium mb-4"
        >
          <Plus size={16} /> Ajouter un revenu
        </button>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <input
            type="number"
            placeholder="Montant (FCFA)"
            value={form.amount_fcfa}
            onChange={e => setForm(p => ({ ...p, amount_fcfa: e.target.value }))}
            className="w-full bg-muted rounded-xl px-3 py-2.5 text-foreground text-sm mb-2 outline-none border border-transparent focus:border-gold/50"
          />
          <input
            type="text"
            placeholder="Source (client, projet...)"
            value={form.source}
            onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
            className="w-full bg-muted rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground text-sm mb-2 outline-none border border-transparent focus:border-gold/50"
          />
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
            className="w-full bg-muted rounded-xl px-3 py-2.5 text-foreground text-sm mb-2 outline-none border border-transparent focus:border-gold/50"
          />

          <label className="text-xs text-muted-foreground mb-1 mt-1 block flex items-center gap-1"><Link2 size={12} /> Action liée (essentiel pour l'historique)</label>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm mb-2 outline-none border border-transparent focus:border-gold/50 flex items-center justify-between text-left"
          >
            <span className={form.task_id ? 'text-foreground truncate pr-2' : 'text-muted-foreground'}>
              {form.task_id
                ? (tasks.find(t => t.id === form.task_id)?.title || 'Tâche liée')
                : '— Aucune tâche liée —'}
            </span>
            <ChevronRight size={14} className="text-muted-foreground shrink-0" />
          </button>
          <TaskPickerDrawer
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            tasks={tasks}
            selectedId={form.task_id}
            onSelect={(id) => setForm(p => ({ ...p, task_id: id }))}
          />
          {!form.task_id && (
            <input
              type="text"
              placeholder="Ou décris l'action (ex: 'Cold call client X')"
              value={form.action_label}
              onChange={e => setForm(p => ({ ...p, action_label: e.target.value }))}
              className="w-full bg-muted rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground text-sm mb-3 outline-none border border-transparent focus:border-gold/50"
            />
          )}

          <div className="flex gap-3">
            <button onClick={() => setAdding(false)} className="flex-1 bg-muted text-muted-foreground rounded-xl py-2.5 text-sm">Annuler</button>
            <button onClick={add} className="flex-1 bg-gold text-background rounded-xl py-2.5 text-sm font-bold">Ajouter</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {revenues.map(r => (
          <div key={r.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-success">+{r.amount_fcfa?.toLocaleString()} FCFA</p>
              <p className="text-muted-foreground text-xs truncate">{r.source || 'Sans source'} · {r.date}</p>
              {taskLabel(r) && (
                <p className="text-blue-electric text-xs mt-1 flex items-center gap-1 truncate">
                  <Link2 size={10} /> {taskLabel(r)}
                </p>
              )}
            </div>
            <button
              onClick={() => remove(r.id)}
              aria-label="Supprimer le revenu"
              className="text-muted-foreground hover:text-destructive ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {revenues.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">Aucun revenu enregistré</p>
        )}
      </div>
    </div>
  );
}