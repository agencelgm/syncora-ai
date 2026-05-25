import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';
import VoiceRecorder from '@/components/tasks/VoiceRecorder';

export default function FloatingVoiceButton() {
  const [showRecorder, setShowRecorder] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowRecorder(true)}
        className="fixed bottom-20 left-4 w-14 h-14 bg-gold text-background rounded-full shadow-lg shadow-gold/40 flex items-center justify-center z-[100] hover:scale-110 transition-transform"
        aria-label="Enregistrer une tâche"
      >
        <Mic size={24} />
      </button>

      <AnimatePresence>
        {showRecorder && (
          <VoiceRecorder
            onTasksExtracted={() => setShowRecorder(false)}
            onClose={() => setShowRecorder(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}