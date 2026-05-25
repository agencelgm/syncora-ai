import { useState } from 'react';
import { Plus, DollarSign, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function RevenueTracker({ revenues, onRefresh }) {
  const [form, setForm] = useState({ amount_fcfa: '', date: format(new Date(), 'yyyy-MM-dd'), source: '' });
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!form.amount_fcfa) return;
    await base44.entities.RevenueEntry.create({ ...form, amount_fcfa: Number(form.amount_fcfa) });
    setForm({ amount_fcfa: '', date: format(new Date(), 'yyyy-MM-dd'), source: '' });
    setAdding(false);
    onRefresh();
  };

  const remove = async (id) => {
    await base44.entities.RevenueEntry.delete(id);
    onRefresh();
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
            className="w-full bg-muted rounded-xl px-3 py-2.5 text-foreground text-sm mb-3 outline-none border border-transparent focus:border-gold/50"
          />
          <div className="flex gap-3">
            <button onClick={() => setAdding(false)} className="flex-1 bg-muted text-muted-foreground rounded-xl py-2.5 text-sm">Annuler</button>
            <button onClick={add} className="flex-1 bg-gold text-background rounded-xl py-2.5 text-sm font-bold">Ajouter</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {revenues.map(r => (
          <div key={r.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-success">+{r.amount_fcfa?.toLocaleString()} FCFA</p>
              <p className="text-muted-foreground text-xs">{r.source || 'Sans source'} · {r.date}</p>
            </div>
            <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive p-1">
              <Trash2 size={14} />
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