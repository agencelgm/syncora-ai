import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Upload, Camera, Loader2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const TASK_PRIORITIES = ['critical', 'high', 'medium', 'low'];

const normalizeExtractedTasks = (tasks = []) => (
  tasks
    .slice(0, 10)
    .map(task => ({
      title: String(task?.title || '').trim(),
      description: String(task?.description || '').trim(),
      priority: TASK_PRIORITIES.includes(task?.priority) ? task.priority : 'medium',
      due_date: String(task?.due_date || '').trim(),
      due_time: String(task?.due_time || '').trim(),
      estimated_value_fcfa: Number(task?.estimated_value_fcfa) || 0,
      ai_priority_score: Number(task?.ai_priority_score) || 60,
      ai_coaching_note: String(task?.ai_coaching_note || '').trim(),
      tags: Array.isArray(task?.tags)
        ? task.tags.map(tag => String(tag).trim()).filter(Boolean).slice(0, 5)
        : [],
    }))
    .filter(task => task.title)
);

export default function ImageCapture({
  mode = 'notes',
  onProcessed,
  onTasksExtracted,
  onClose,
}) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [error, setError] = useState('');
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const isBusy = uploading || processing;
  const isTaskMode = mode === 'tasks';

  const openFilePicker = (inputRef) => {
    if (isBusy) return;
    setError('');
    inputRef.current?.click();
  };

  const resetImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFileUrl(null);
    setError('');
  };

  const handleFile = async (file) => {
    if (!file) {
      setError("Aucun fichier sélectionné.");
      return;
    }

    if (file.type && !file.type.startsWith('image/')) {
      setError("Sélectionne une image valide.");
      return;
    }

    setError('');
    setFileUrl(null);
    setUploading(true);

    const previewUrl = URL.createObjectURL(file);
    setPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return previewUrl;
    });

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (!file_url) throw new Error('Missing uploaded file URL');
      setFileUrl(file_url);
    } catch (err) {
      setFileUrl(null);
      setError("Impossible d'envoyer l'image. Réessaie avec une autre photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    handleFile(file);
  };

  const processImage = async () => {
    if (!fileUrl || isBusy) return;

    setError('');
    setProcessing(true);

    try {
      if (isTaskMode) {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyse cette image de notes manuscrites, cahier, tableau ou capture d'écran.
Transforme le contenu en tâches concrètes et actionnables.
Ne retourne pas seulement une transcription: crée des tâches prêtes à être ajoutées dans une todo list.
Retourne au maximum 10 tâches.

Pour chaque tâche:
- title: titre court et actionnable
- description: contexte utile si nécessaire
- priority: "critical" | "high" | "medium" | "low"
- due_date: date au format YYYY-MM-DD si clairement indiquée, sinon chaîne vide
- due_time: heure au format HH:MM si clairement indiquée, sinon chaîne vide
- estimated_value_fcfa: nombre, 0 si non applicable
- ai_priority_score: nombre entre 1 et 100
- ai_coaching_note: courte phrase motivante ou stratégique
- tags: 0 à 5 mots-clés`,
          file_urls: [fileUrl],
          response_json_schema: {
            type: 'object',
            properties: {
              tasks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    priority: { type: 'string' },
                    due_date: { type: 'string' },
                    due_time: { type: 'string' },
                    estimated_value_fcfa: { type: 'number' },
                    ai_priority_score: { type: 'number' },
                    ai_coaching_note: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        });

        const extractedTasks = normalizeExtractedTasks(result?.tasks || []);
        if (extractedTasks.length === 0) {
          setError("Aucune tâche claire n'a été détectée. Essaie une photo plus nette ou plus cadrée.");
          return;
        }

        await onTasksExtracted?.(fileUrl, extractedTasks);
        return;
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse cette image (photo de cahier, note manuscrite ou capture d'écran).
Extrait et structure tout le contenu textuel.
Identifie les tâches, actions, idées et notes.
Retourne en JSON:
- transcription: texte complet extrait
- tasks: liste de tâches identifiées (titres courts)`,
        file_urls: [fileUrl],
        response_json_schema: {
          type: 'object',
          properties: {
            transcription: { type: 'string' },
            tasks: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      onProcessed?.(
        fileUrl,
        `Transcription:\n${result.transcription}\n\nTâches identifiées:\n${result.tasks?.map((t, i) => `${i + 1}. ${t}`).join('\n') || 'Aucune'}`
      );
    } catch (err) {
      setError(isTaskMode
        ? "Impossible de transformer cette image en tâches pour l'instant."
        : "Impossible d'analyser cette image pour l'instant."
      );
    } finally {
      setProcessing(false);
    }
  };

  const modal = (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-end"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="w-full max-w-md mx-auto bg-card rounded-t-3xl p-6 border-t border-border"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 2rem)' }}
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          onChange={handleInputChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          onChange={handleInputChange}
        />

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground">Envoyer une image</h3>
          <button onClick={onClose} className="text-muted-foreground"><X size={20} /></button>
        </div>

        {preview ? (
          <div className="mb-4">
            <img src={preview} alt="Preview" className="w-full rounded-2xl max-h-48 object-cover" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openFilePicker(galleryInputRef)}
            disabled={isBusy}
            className="w-full h-40 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3 text-muted-foreground mb-4 hover:border-gold/50 hover:text-foreground transition-all disabled:opacity-60"
          >
            <Upload size={28} />
            <span className="text-sm">Sélectionne une photo ou capture</span>
          </button>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive px-3 py-2 mb-4">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          {!preview ? (
            <>
              <button
                type="button"
                onClick={() => openFilePicker(galleryInputRef)}
                disabled={isBusy}
                className="flex-1 bg-card border border-border text-foreground rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:border-gold/50 hover:text-gold transition-all disabled:opacity-60"
              >
                <Upload size={16} /> Galerie
              </button>
              <button
                type="button"
                onClick={() => openFilePicker(cameraInputRef)}
                disabled={isBusy}
                className="flex-1 bg-card border border-border text-foreground rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:border-gold/50 hover:text-gold transition-all disabled:opacity-60"
              >
                <Camera size={16} /> Photo
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={resetImage}
              disabled={isBusy}
              className="flex-1 bg-muted text-muted-foreground rounded-xl py-3 text-sm font-medium disabled:opacity-60"
            >
              Changer
            </button>
          )}
          <button
            type="button"
            onClick={processImage}
            disabled={!fileUrl || isBusy}
            className="flex-1 bg-gold text-background rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isBusy ? <Loader2 size={14} className="animate-spin" /> : null}
            {uploading ? 'Envoi...' : processing ? 'Analyse...' : 'Analyser'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
