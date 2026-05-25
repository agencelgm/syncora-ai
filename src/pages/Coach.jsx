import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Image, Loader2, Wand2, CheckCircle2 } from 'lucide-react';
import ChatMessage from '@/components/coach/ChatMessage';
import ImageCapture from '@/components/coach/ImageCapture';
import { getCurrentUser } from '@/hooks/useCurrentUser';

export default function Coach() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showImageCapture, setShowImageCapture] = useState(false);
  const [profile, setProfile] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    const user = await getCurrentUser();
    const uid = user?.id;
    const [msgs, profiles] = await Promise.all([
      base44.entities.ChatMessage.filter({ created_by_id: uid }, 'created_date', 50),
      base44.entities.UserProfile.filter({ created_by_id: uid }, '-created_date', 1),
    ]);
    setMessages(msgs);
    setProfile(profiles[0] || null);

    if (msgs.length === 0) {
      addWelcomeMessage();
    }
  };

  const addWelcomeMessage = async () => {
    const welcome = await base44.entities.ChatMessage.create({
      role: 'assistant',
      content: `Salut ! Je suis ton coach IA — un mix entre Alex Hormozi et Tony Robbins. 💪\n\nJe suis là pour t'aider à :\n• Créer et prioriser tes tâches\n• Atteindre tes objectifs financiers\n• Analyser tes photos et notes\n• Te donner un plan d'action\n\nDis-moi : **qu'est-ce que tu veux accomplir aujourd'hui ?** Ou envoie-moi une photo de tes notes et je les transforme en tâches ! 🚀`,
      channel: 'in_app',
    });
    setMessages([welcome]);
  };

  const sendMessage = async (text, imageUrl = null) => {
    if (!text.trim() && !imageUrl) return;
    setLoading(true);

    const userMsg = await base44.entities.ChatMessage.create({
      role: 'user',
      content: text || '[Image envoyée]',
      image_url: imageUrl || undefined,
      channel: 'in_app',
    });
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Build context
    const recentMsgs = [...messages.slice(-8), userMsg]
      .map(m => `${m.role === 'user' ? 'Utilisateur' : 'Coach'}: ${m.content}`)
      .join('\n');

    const profileCtx = profile
      ? `Profil: ${profile.full_name || 'Utilisateur'}, compétences: ${profile.skills?.join(', ') || 'non précisées'}, objectif revenus: ${profile.target_monthly_revenue_fcfa?.toLocaleString() || '?'} FCFA/mois.`
      : '';

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un coach IA personnel entre Alex Hormozi (pragmatique, ROI, exécution) et Tony Robbins (énergie, petites victoires, effet boule de neige). Tu parles en français. Tu es direct, énergique, actionnable.

${profileCtx}

Conversation récente:
${recentMsgs}

Si l'utilisateur demande des actions à faire, génère des tâches concrètes.
Réponds de façon concise (max 200 mots), avec énergie et précision.
Si pertinent, propose des tâches à créer en listant task_titles (max 3).`,
      response_json_schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          task_titles: { type: 'array', items: { type: 'string' } },
        },
      },
      file_urls: imageUrl ? [imageUrl] : undefined,
    });

    const tasksCreated = [];
    for (const title of (result.task_titles || [])) {
      const t = await base44.entities.Task.create({
        title,
        source: 'ai_chat',
        priority: 'medium',
        ai_priority_score: 65,
      });
      tasksCreated.push(t.id);
    }

    const assistantMsg = await base44.entities.ChatMessage.create({
      role: 'assistant',
      content: result.message,
      tasks_created: tasksCreated,
      channel: 'in_app',
    });
    setMessages(prev => [...prev, assistantMsg]);
    setLoading(false);
  };

  const handleImageProcessed = async (imageUrl, extractedText) => {
    setShowImageCapture(false);
    await sendMessage(extractedText ? `[Note extraite de l'image]\n${extractedText}` : 'Voici une image de mes notes, peux-tu extraire les tâches ?', imageUrl);
  };

  const QUICK_PROMPTS = [
    "Qu'est-ce que j'ai à faire aujourd'hui ?",
    "Donne-moi un plan pour augmenter mes revenus",
    "Comment prioriser mes tâches ?",
    "Analyse mes notes",
  ];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-4 pb-3 border-b border-border bg-background" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-gold to-gold/60 rounded-xl flex items-center justify-center">
            <Wand2 size={18} className="text-background" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">Coach IA</h1>
            <p className="text-xs text-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" /> En ligne
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-32">
        {messages.length === 0 && !loading && (
          <div className="space-y-2 mt-4">
            <p className="text-muted-foreground text-xs text-center mb-3">Suggestions rapides</p>
            {QUICK_PROMPTS.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="w-full text-left bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground hover:border-gold/50 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <AnimatePresence>
          {messages.map((msg, i) => (
            <ChatMessage key={msg.id} message={msg} index={i} />
          ))}
        </AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="w-7 h-7 bg-gold/20 rounded-xl flex items-center justify-center">
              <Loader2 size={14} className="text-gold animate-spin" />
            </div>
            <span>Le coach réfléchit...</span>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-3 bg-background border-t border-border pt-3">
        {messages.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            {QUICK_PROMPTS.slice(0, 3).map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="flex-shrink-0 text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full"
              >
                {q.length > 25 ? q.slice(0, 25) + '…' : q}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => setShowImageCapture(true)}
            className="bg-card border border-border rounded-xl w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-gold hover:border-gold/50 transition-all flex-shrink-0"
          >
            <Image size={18} />
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && sendMessage(input)}
            placeholder="Envoie un message à ton coach..."
            className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-gold/50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="bg-gold text-background rounded-xl w-11 h-11 flex items-center justify-center disabled:opacity-50 flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {showImageCapture && (
        <ImageCapture
          onProcessed={handleImageProcessed}
          onClose={() => setShowImageCapture(false)}
        />
      )}
    </div>
  );
}