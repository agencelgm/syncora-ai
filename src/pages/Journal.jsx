import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Smile, Frown, Meh, Battery, Zap, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MOODS = [
  { key: 'excellent', icon: '🚀', label: 'Excellent' },
  { key: 'good', icon: '😊', label: 'Bien' },
  { key: 'neutral', icon: '😐', label: 'Neutre' },
  { key: 'tired', icon: '😴', label: 'Fatigué' },
  { key: 'struggling', icon: '😤', label: 'Difficile' },
];

export default function Journal() {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    content: '',
    mood: 'good',
    revenue_today_fcfa: '',
    wins: [],
  });
  const [winInput, setWinInput] = useState('');

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    const data = await base44.entities.JournalEntry.list('-date', 30);
    setEntries(data);
    setLoading(false);
  };

  const addWin = () => {
    if (!winInput.trim()) return;
    setForm(p => ({ ...p, wins: [...p.wins, winInput.trim()] }));
    setWinInput('');
  };

  const analyzeAndSave = async () => {
    if (!form.content && form.wins.length === 0) return;
    setAnalyzing(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Coach IA (style Hormozi+Robbins). Analyse cette entrée de journal et génère :
1. ai_insights: bilan percutant + 1 leçon clé + encouragement (max 80 mots)
2. tasks_to_create: array de 2-3 titres de tâches concrètes générées par cette entrée

Journal du ${form.date}:
"${form.content}"

Victoires du jour: ${form.wins.join(', ') || 'Non renseigné'}
Revenus: ${form.revenue_today_fcfa || 0} FCFA`,
      response_json_schema: {
        type: 'object',
        properties: {
          ai_insights: { type: 'string' },
          tasks_to_create: { type: 'array', items: { type: 'string' } },
        },
      },
    });

    const tasksCreated = [];
    for (const title of (result.tasks_to_create || [])) {
      const t = await base44.entities.Task.create({
        title,
        source: 'journal',
        priority: 'medium',
        ai_priority_score: 60,
      });
      tasksCreated.push(t.id);
    }

    await base44.entities.JournalEntry.create({
      ...form,
      revenue_today_fcfa: Number(form.revenue_today_fcfa) || 0,
      ai_insights: result.ai_insights,
      tasks_generated: tasksCreated,
    });

    setForm({ date: format(new Date(), 'yyyy-MM-dd'), content: '', mood: 'good', revenue_today_fcfa: '', wins: [] });
    setShowForm(false);
    setAnalyzing(false);
    loadEntries();
  };

  return (
    <div className="px-4 pt-8 pb-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Journal</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-gold text-background rounded-xl w-9 h-9 flex items-center justify-center shadow-lg shadow-gold/20"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* New entry form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-card border border-border rounded-2xl p-4 mb-5"
          >
            <p className="text-foreground font-semibold mb-3">Entrée du {format(new Date(form.date), 'd MMMM', { locale: fr })}</p>
            
            {/* Mood */}
            <div className="flex gap-2 mb-3">
              {MOODS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setForm(p => ({ ...p, mood: m.key }))}
                  className={`flex-1 flex flex-col items-center py-2 rounded-xl text-lg transition-all ${form.mood === m.key ? 'bg-gold/20 border border-gold/50' : 'bg-muted'}`}
                >
                  {m.icon}
                </button>
              ))}
            </div>

            <textarea
              placeholder="Comment s'est passée ta journée ? Qu'as-tu accompli ? Qu'as-tu appris ?"
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              rows={4}
              className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm mb-3 outline-none border border-transparent focus:border-gold/50 resize-none"
            />

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Ajoute une victoire du jour..."
                value={winInput}
                onChange={e => setWinInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addWin()}
                className="flex-1 bg-muted rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground text-sm outline-none border border-transparent focus:border-gold/50"
              />
              <button onClick={addWin} className="bg-gold/20 text-gold rounded-xl px-3 text-sm font-medium">+</button>
            </div>
            {form.wins.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {form.wins.map((w, i) => (
                  <span key={i} className="bg-gold/10 text-gold text-xs px-2 py-1 rounded-full">🏆 {w}</span>
                ))}
              </div>
            )}

            <input
              type="number"
              placeholder="Revenus générés aujourd'hui (FCFA)"
              value={form.revenue_today_fcfa}
              onChange={e => setForm(p => ({ ...p, revenue_today_fcfa: e.target.value }))}
              className="w-full bg-muted rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground text-sm mb-4 outline-none border border-transparent focus:border-gold/50"
            />

            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 bg-muted text-muted-foreground rounded-xl py-3 text-sm">Annuler</button>
              <button
                onClick={analyzeAndSave}
                disabled={analyzing}
                className="flex-1 bg-gold text-background rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2"
              >
                {analyzing ? <><Loader2 size={14} className="animate-spin" /> Analyse...</> : '✨ Analyser & Sauvegarder'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entries list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => {
            const mood = MOODS.find(m => m.key === entry.mood);
            const expanded = expandedId === entry.id;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-2xl p-4"
              >
                <button
                  className="w-full text-left"
                  onClick={() => setExpandedId(expanded ? null : entry.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{mood?.icon || '📝'}</span>
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          {format(new Date(entry.date), 'd MMMM yyyy', { locale: fr })}
                        </p>
                        {entry.revenue_today_fcfa > 0 && (
                          <p className="text-success text-xs">+{entry.revenue_today_fcfa.toLocaleString()} FCFA</p>
                        )}
                      </div>
                    </div>
                    {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </div>
                </button>
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 mt-3 border-t border-border">
                        {entry.content && <p className="text-foreground/80 text-sm mb-3">{entry.content}</p>}
                        {entry.wins?.length > 0 && (
                          <div className="mb-3">
                            {entry.wins.map((w, j) => <span key={j} className="inline-block bg-gold/10 text-gold text-xs px-2 py-1 rounded-full mr-1">🏆 {w}</span>)}
                          </div>
                        )}
                        {entry.ai_insights && (
                          <div className="bg-blue-electric/5 border border-blue-electric/20 rounded-xl p-3">
                            <p className="text-xs text-blue-electric/80 leading-relaxed">{entry.ai_insights}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
          {entries.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-12">Ton journal est vide. Commence aujourd'hui !</p>
          )}
        </div>
      )}
    </div>
  );
}