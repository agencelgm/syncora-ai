import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wand2, Loader2, Camera } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ImageCapture from '@/components/coach/ImageCapture';
import { asObject } from '@/lib/llm';

const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const PRIORITY_LABELS = { critical: 'Critique', high: 'Haute', medium: 'Moyenne', low: 'Faible' };

export default function TaskForm({ task, onSave, onClose, onCreateTasks }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    due_date: task?.due_date || '',
    due_time: task?.due_time || '',
    estimated_value_fcfa: task?.estimated_value_fcfa || '',
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [showImageCapture, setShowImageCapture] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);

  const handleTasksExtracted = async (_imageUrl, extractedTasks) => {
    if (onCreateTasks) {
      await onCreateTasks(extractedTasks);
      return;
    }
    setShowImageCapture(false);
  };

  const enrichWithAI = async () => {
    if (!form.title) return;
    setAiLoading(true);
    try {
    const result = asObject(await base44.integrations.Core.InvokeLLM({
      prompt: `Pour une tâche intitulée "${form.title}", génère en JSON :
- priority: "critical"|"high"|"medium"|"low" 
- ai_priority_score: 1-100
- ai_coaching_note: une phrase courte de coaching (style Hormozi/Robbins, max 15 mots)
- estimated_value_fcfa: estimation de valeur générée (nombre, 0 si non applicable)`,
      response_json_schema: {
        type: 'object',
        properties: {
          priority: { type: 'string' },
          ai_priority_score: { type: 'number' },
          ai_coaching_note: { type: 'string' },
          estimated_value_fcfa: { type: 'number' },
        },
      },
    }));
    setForm(prev => ({ ...prev, ...result }));
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onSave({ ...form, estimated_value_fcfa: Number(form.estimated_value_fcfa) || 0 });
  };

  const modal = (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-end"
      onClick={onClose}
    >
      <motion.div
        ref={scrollRef}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="w-full max-w-md mx-auto bg-card rounded-t-3xl border-t border-border overflow-y-auto"
        style={{ maxHeight: 'calc(100dvh - 12px)' }}
        onClick={e => e.stopPropagation()}
      >
      <div className="px-4 pt-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground">{task ? 'Modifier la tâche' : 'Nouvelle tâche'}</h3>
          <button onClick={onClose} className="text-muted-foreground"><X size={20} /></button>
        </div>

        <input
          type="text"
          placeholder="Titre de la tâche..."
          value={form.title}
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          className="w-full bg-muted rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground text-sm mb-2 outline-none border border-transparent focus:border-gold/50"
        />

        <textarea
          placeholder="Description (optionnel)..."
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          rows={2}
          className="w-full bg-muted rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground text-sm mb-2 outline-none border border-transparent focus:border-gold/50 resize-none"
        />

        <div className="flex gap-2 mb-2">
          {PRIORITIES.map(p => (
            <button
              key={p}
              onClick={() => setForm(prev => ({ ...prev, priority: p }))}
              className={`flex-1 text-xs py-1.5 rounded-xl font-medium transition-all ${
                form.priority === p
                  ? 'bg-gold text-background'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-2">
          <input
            type="date"
            value={form.due_date}
            onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
            className="flex-1 bg-muted rounded-xl px-3 py-2 text-foreground text-sm outline-none border border-transparent focus:border-gold/50"
          />
          <input
            type="time"
            value={form.due_time}
            onChange={e => setForm(p => ({ ...p, due_time: e.target.value }))}
            className="flex-1 bg-muted rounded-xl px-3 py-2 text-foreground text-sm outline-none border border-transparent focus:border-gold/50"
          />
        </div>
        <input
          type="number"
          placeholder="Valeur estimée (FCFA)"
          value={form.estimated_value_fcfa}
          onChange={e => setForm(p => ({ ...p, estimated_value_fcfa: e.target.value }))}
          className="w-full bg-muted rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground text-sm outline-none border border-transparent focus:border-gold/50 mb-3"
        />

        <div className="flex gap-2">
          <button
            onClick={() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); setShowImageCapture(true); }}
            className="flex items-center justify-center bg-secondary border border-border text-foreground rounded-xl w-12 h-12 shrink-0"
          >
            <Camera size={18} />
          </button>
          <button
            onClick={enrichWithAI}
            disabled={aiLoading || !form.title}
            className="flex items-center justify-center gap-1.5 bg-blue-electric/20 border border-blue-electric/50 text-blue-electric rounded-xl px-4 h-12 text-sm font-semibold shrink-0 disabled:opacity-40"
          >
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            IA
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 bg-gold text-background rounded-xl h-12 text-base font-bold shadow-lg shadow-gold/30"
          >
            {task ? 'Modifier' : 'Créer'}
          </button>
        </div>

      </div>
      </motion.div>

      <AnimatePresence>
        {showImageCapture && (
          <ImageCapture
            mode="tasks"
            onTasksExtracted={handleTasksExtracted}
            onClose={() => setShowImageCapture(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
