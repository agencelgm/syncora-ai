import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Wand2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const CATEGORIES = ['financial', 'health', 'learning', 'relationship', 'project', 'other'];

export default function ObjectiveForm({ objective, onSave, onClose }) {
  const [form, setForm] = useState({
    title: objective?.title || '',
    description: objective?.description || '',
    category: objective?.category || 'financial',
    target_amount_fcfa: objective?.target_amount_fcfa || '',
    current_amount_fcfa: objective?.current_amount_fcfa || 0,
    target_date: objective?.target_date || '',
    ai_strategy: objective?.ai_strategy || '',
  });
  const [aiLoading, setAiLoading] = useState(false);

  const generateStrategy = async () => {
    if (!form.title) return;
    setAiLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Coach style Hormozi+Robbins. Pour l'objectif "${form.title}" ${form.target_amount_fcfa ? `(cible: ${form.target_amount_fcfa} FCFA)` : ''}, génère une stratégie en 2-3 phrases courtes et percutantes. Sois concret et actionnable. Max 80 mots.`,
    });
    setForm(p => ({ ...p, ai_strategy: result }));
    setAiLoading(false);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onSave({
      ...form,
      target_amount_fcfa: Number(form.target_amount_fcfa) || 0,
      current_amount_fcfa: Number(form.current_amount_fcfa) || 0,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="w-full max-w-md mx-auto bg-card rounded-t-3xl p-6 border-t border-border max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground">{objective ? 'Modifier' : 'Nouvel objectif'}</h3>
          <button onClick={onClose} className="text-muted-foreground"><X size={20} /></button>
        </div>

        <input
          type="text"
          placeholder="Titre de l'objectif..."
          value={form.title}
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm mb-3 outline-none border border-transparent focus:border-gold/50"
        />

        <div className="flex gap-2 mb-3 overflow-x-auto">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setForm(p => ({ ...p, category: c }))}
              className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${form.category === c ? 'bg-gold text-background' : 'bg-muted text-muted-foreground'}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Cible (FCFA)</label>
            <input
              type="number"
              placeholder="5 000 000"
              value={form.target_amount_fcfa}
              onChange={e => setForm(p => ({ ...p, target_amount_fcfa: e.target.value }))}
              className="w-full bg-muted rounded-xl px-3 py-2.5 text-foreground text-sm outline-none border border-transparent focus:border-gold/50"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Actuel (FCFA)</label>
            <input
              type="number"
              placeholder="500 000"
              value={form.current_amount_fcfa}
              onChange={e => setForm(p => ({ ...p, current_amount_fcfa: e.target.value }))}
              className="w-full bg-muted rounded-xl px-3 py-2.5 text-foreground text-sm outline-none border border-transparent focus:border-gold/50"
            />
          </div>
        </div>

        <input
          type="date"
          value={form.target_date}
          onChange={e => setForm(p => ({ ...p, target_date: e.target.value }))}
          className="w-full bg-muted rounded-xl px-3 py-2.5 text-foreground text-sm mb-3 outline-none border border-transparent focus:border-gold/50"
        />

        {form.ai_strategy && (
          <div className="bg-blue-electric/10 border border-blue-electric/30 rounded-xl p-3 mb-3">
            <p className="text-xs text-blue-electric/80">{form.ai_strategy}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={generateStrategy}
            disabled={aiLoading || !form.title}
            className="flex items-center gap-2 bg-blue-electric/10 border border-blue-electric/30 text-blue-electric rounded-xl px-4 py-3 text-sm font-medium disabled:opacity-50"
          >
            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            Stratégie IA
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 bg-gold text-background rounded-xl py-3 text-sm font-bold"
          >
            {objective ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}