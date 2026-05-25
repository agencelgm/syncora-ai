import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { X, Zap, Loader2 } from 'lucide-react';
import { asText } from '@/lib/llm';

export default function DailyBriefing({ open, onClose, tasks, objectives }) {
  const [briefing, setBriefing] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && !briefing && !loading) generate();
  }, [open]);

  const generate = async () => {
    if (briefing) return;
    setLoading(true);

    try {
      const topTasks = tasks
        .slice(0, 5)
        .map((t, i) => `${i + 1}. [${t.priority}] ${t.title}${t.defer_count > 0 ? ` (reportee ${t.defer_count}x)` : ''}`)
        .join('\n');
      const obj = objectives[0]
        ? `Objectif principal : ${objectives[0].title} (${objectives[0].current_amount_fcfa?.toLocaleString() || 0} / ${objectives[0].target_amount_fcfa?.toLocaleString()} FCFA)`
        : '';

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Tu es un coach entre Alex Hormozi et Tony Robbins. Genere un briefing matinal percutant, court (150 mots max), en francais. Commence par une phrase de motivation incisive, puis liste les 3 priorites absolues du jour avec une raison strategique pour chacune. Termine par un defi du jour.

Taches disponibles:
${topTasks}

${obj}

Sois direct, energique, sans fioritures. Style: commande, pas suggestion.`,
      });

      setBriefing(asText(result, "Impossible de generer le briefing pour l'instant."));
    } catch (err) {
      setBriefing("Impossible de generer le briefing pour l'instant. Reessaie dans quelques instants.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="w-full max-w-md mx-auto bg-card rounded-t-3xl p-6 border-t border-border max-h-[calc(100vh-80px)] overflow-y-auto pb-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-gold" />
                <h3 className="font-bold text-foreground">Briefing du jour</h3>
              </div>
              <button onClick={onClose} className="text-muted-foreground"><X size={20} /></button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10 gap-3 text-gold">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Ton coach prepare le briefing...</span>
              </div>
            ) : (
              <p className="text-foreground/90 leading-relaxed whitespace-pre-line text-sm">{briefing}</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
