import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Mic, Square, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function VoiceRecorder({ onTasksExtracted, onClose }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        await processAudio(file);
      };

      mediaRecorder.start();
      setRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Impossible d\'accéder au microphone. Vérifie les permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const processAudio = async (file) => {
    setProcessing(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const response = await base44.functions.invoke('transcribeAndExtractTasks', { audio_url: file_url });
      
      if (response.data.tasks && response.data.tasks.length > 0) {
        await onTasksExtracted(response.data.tasks);
        onClose();
      } else {
        alert('Aucune tâche détectée. Essaie avec plus de détails.');
      }
    } catch (err) {
      alert('Erreur lors du traitement de l\'audio.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[250] flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="w-full max-w-md mx-auto bg-card rounded-t-3xl border-t border-border p-6"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-foreground">Enregistrement vocal</h3>
          <button onClick={onClose} className="text-muted-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="w-32 h-32 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center">
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={processing}
              className="w-24 h-24 rounded-full bg-gold hover:bg-gold/90 flex items-center justify-center transition-all disabled:opacity-50"
            >
              {processing ? (
                <Loader2 size={40} className="animate-spin text-background" />
              ) : recording ? (
                <Square size={40} className="text-background fill-background" />
              ) : (
                <Mic size={40} className="text-background" />
              )}
            </button>
          </div>

          {duration > 0 && (
            <p className="text-2xl font-bold text-gold">{formatTime(duration)}</p>
          )}

          <p className="text-sm text-muted-foreground text-center">
            {recording
              ? 'Parle librement. Je vais transcrire et créer les tâches.'
              : processing
              ? 'Analyse en cours...'
              : 'Clique pour commencer l\'enregistrement.'}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}