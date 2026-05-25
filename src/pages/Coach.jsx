import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Image, Loader2, Wand2, Mic, MicOff } from 'lucide-react';
import ChatMessage from '@/components/coach/ChatMessage';
import ImageCapture from '@/components/coach/ImageCapture';
import { getCurrentUser } from '@/hooks/useCurrentUser';
import { asObject } from '@/lib/llm';
import { readFunctionError, unwrapFunctionResponse } from '@/lib/functionResponse';

export default function Coach() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [showImageCapture, setShowImageCapture] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    loadData();

    return () => {
      recognitionRef.current?.abort?.();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadData = async () => {
    const user = await getCurrentUser();
    const msgs = await base44.entities.ChatMessage.filter({ created_by_id: user?.id }, 'created_date', 50);
    setMessages(msgs);

    if (msgs.length === 0) {
      addWelcomeMessage();
    }
  };

  const addWelcomeMessage = async () => {
    const welcome = await base44.entities.ChatMessage.create({
      role: 'assistant',
      content: "Salut ! Je suis ton coach IA. Je peux creer des taches, creer des objectifs, synchroniser tes revenus GoHighLevel/Chariow et resumer tes resultats. Pour les actions qui modifient tes donnees, je te demanderai toujours confirmation avant d'executer.",
      channel: 'in_app',
    });
    setMessages([welcome]);
  };

  const sendMessage = async (text, imageUrl = null, source = 'text') => {
    const cleanText = String(text || '').trim();
    if ((!cleanText && !imageUrl) || loading) return;

    setLoading(true);
    setVoiceError('');

    try {
      const userMsg = await base44.entities.ChatMessage.create({
        role: 'user',
        content: cleanText || '[Image envoyee]',
        image_url: imageUrl || undefined,
        channel: 'in_app',
      });

      setMessages(prev => [...prev, userMsg]);
      setInput('');

      const result = asObject(unwrapFunctionResponse(await base44.functions.invoke('agentCommand', {
        message: cleanText || "Analyse cette image et dis-moi quoi faire.",
        source,
      })));

      const assistantMsg = await saveAgentResponse(result);
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const fallback = await saveFallbackMessage(errorMessage(err));
      setMessages(prev => [...prev, fallback]);
    } finally {
      setLoading(false);
    }
  };

  const saveAgentResponse = async (result) => {
    const isConfirmation = result.type === 'confirmation_required';
    const assistant = {
      role: 'assistant',
      content: result.message || fallbackContent(result),
      channel: 'in_app',
      agent_action_id: isConfirmation ? result.actionId : undefined,
      agent_action_type: isConfirmation ? result.actionType : undefined,
      agent_action_status: isConfirmation ? 'pending' : undefined,
      agent_action_summary: isConfirmation ? result.summary : undefined,
    };

    return base44.entities.ChatMessage.create(assistant);
  };

  const saveFallbackMessage = async (content) => {
    const fallback = {
      role: 'assistant',
      content,
      channel: 'in_app',
    };

    try {
      return await base44.entities.ChatMessage.create(fallback);
    } catch {
      return { ...fallback, id: `local-${Date.now()}` };
    }
  };

  const confirmAction = async (message) => {
    if (!message.agent_action_id || actionLoadingId) return;

    setActionLoadingId(message.agent_action_id);
    try {
      const result = asObject(unwrapFunctionResponse(await base44.functions.invoke('agentCommand', {
        confirmActionId: message.agent_action_id,
      })));

      const success = result.type === 'executed';
      const patch = {
        content: result.message || (success ? 'Action executee.' : "Je n'ai pas reussi a executer cette action."),
        agent_action_status: success ? 'executed' : 'failed',
      };

      if (success && result.actionType === 'create_task' && result.result?.taskId) {
        patch.tasks_created = [result.result.taskId];
      }

      await base44.entities.ChatMessage.update(message.id, patch);
      setMessages(prev => prev.map(item => item.id === message.id ? { ...item, ...patch } : item));
    } catch (err) {
      const patch = {
        content: errorMessage(err),
        agent_action_status: 'failed',
      };
      try {
        await base44.entities.ChatMessage.update(message.id, patch);
      } catch {
        // Le message local reste utilisable meme si la sauvegarde echoue.
      }
      setMessages(prev => prev.map(item => item.id === message.id ? { ...item, ...patch } : item));
    } finally {
      setActionLoadingId(null);
    }
  };

  const startVoiceDictation = () => {
    if (loading || listening) return;

    const anyWindow = /** @type {any} */ (window);
    const SpeechRecognition = anyWindow.SpeechRecognition || anyWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("La dictee vocale n'est pas supportee par ce navigateur. Essaie Chrome sur Android ou utilise le champ texte.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setVoiceError('');
      setListening(true);
    };

    recognition.onerror = (event) => {
      setListening(false);
      const permissionDenied = event?.error === 'not-allowed' || event?.error === 'service-not-allowed';
      setVoiceError(permissionDenied
        ? "Permission micro refusee. Autorise le micro dans Android/Chrome, puis reessaie."
        : "Je n'ai pas pu capter la voix. Reessaie ou utilise le champ texte.");
    };

    recognition.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript?.trim() || '';
      if (!transcript) return;

      setInput(transcript);
      sendMessage(transcript, null, 'voice');
    };

    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleImageProcessed = async (imageUrl, extractedText) => {
    setShowImageCapture(false);
    await sendMessage(
      extractedText ? `[Note extraite de l'image]\n${extractedText}` : 'Voici une image de mes notes, peux-tu extraire les taches ?',
      imageUrl,
      'text',
    );
  };

  const QUICK_PROMPTS = [
    "Qu'est-ce que j'ai a faire aujourd'hui ?",
    'Va chercher les resultats de mai dans GoHighLevel',
    'Cree une tache appeler client demain 10h',
    'Quels sont mes resultats de mai ?',
  ];

  return (
    <div className="flex flex-col h-screen">
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

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-36">
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
            <ChatMessage
              key={msg.id}
              message={msg}
              index={i}
              onConfirmAction={confirmAction}
              actionLoadingId={actionLoadingId}
            />
          ))}
        </AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="w-7 h-7 bg-gold/20 rounded-xl flex items-center justify-center">
              <Loader2 size={14} className="text-gold animate-spin" />
            </div>
            <span>Le coach analyse...</span>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-3 bg-background border-t border-border pt-3">
        {messages.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            {QUICK_PROMPTS.slice(0, 3).map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="flex-shrink-0 text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full"
              >
                {q.length > 28 ? `${q.slice(0, 28)}...` : q}
              </button>
            ))}
          </div>
        )}
        {voiceError && (
          <p className="text-xs text-destructive mb-2 px-1">{voiceError}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowImageCapture(true)}
            className="bg-card border border-border rounded-xl w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-gold hover:border-gold/50 transition-all flex-shrink-0"
            title="Envoyer une image"
          >
            <Image size={18} />
          </button>
          <button
            type="button"
            onClick={startVoiceDictation}
            disabled={loading}
            className={`border rounded-xl w-11 h-11 flex items-center justify-center transition-all flex-shrink-0 ${
              listening
                ? 'bg-gold text-background border-gold'
                : 'bg-card border-border text-muted-foreground hover:text-gold hover:border-gold/50'
            }`}
            title="Dictee vocale"
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && sendMessage(input)}
            placeholder="Message au coach..."
            className="min-w-0 flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-gold/50"
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="bg-gold text-background rounded-xl w-11 h-11 flex items-center justify-center disabled:opacity-50 flex-shrink-0"
            title="Envoyer"
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

function fallbackContent(result) {
  if (result.type === 'answer') return result.message || 'Voici le resume demande.';
  if (result.type === 'unknown') return result.message || "Je n'ai pas reconnu l'action.";
  if (result.type === 'error') return result.message || "Je n'ai pas pu traiter cette commande.";
  return result.message || 'Action preparee.';
}

function errorMessage(err) {
  return readFunctionError(err, 'agentCommand') || "Je n'ai pas reussi a traiter ce message pour l'instant.";
}
