import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Camera, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ImageCapture({ onProcessed, onClose }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const galleryRef = useRef();
  const cameraRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFileUrl(file_url);
    setUploading(false);
  };

  const processImage = async () => {
    if (!fileUrl) return;
    setUploading(true);
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
    setUploading(false);
    onProcessed(fileUrl, `Transcription:\n${result.transcription}\n\nTâches identifiées:\n${result.tasks?.map((t, i) => `${i + 1}. ${t}`).join('\n') || 'Aucune'}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="w-full max-w-md mx-auto bg-card rounded-t-3xl p-6 border-t border-border"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 2rem)' }}
        onClick={e => e.stopPropagation()}
      >
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
            onClick={() => galleryRef.current?.click()}
            className="w-full h-40 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3 text-muted-foreground mb-4 hover:border-gold/50 transition-all"
          >
            <Upload size={28} />
            <span className="text-sm">Sélectionne une photo ou capture</span>
          </button>
        )}

        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />

        <div className="flex gap-3">
          {!preview ? (
            <>
              <button
                onClick={() => galleryRef.current?.click()}
                className="flex-1 bg-muted text-muted-foreground rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2"
              >
                <Upload size={16} /> Galerie
              </button>
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex-1 bg-muted text-muted-foreground rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2"
              >
                <Camera size={16} /> Photo
              </button>
            </>
          ) : (
            <button
              onClick={() => { setPreview(null); setFileUrl(null); }}
              className="flex-1 bg-muted text-muted-foreground rounded-xl py-3 text-sm font-medium"
            >
              Changer
            </button>
          )}
          <button
            onClick={processImage}
            disabled={!fileUrl || uploading}
            className="flex-1 bg-gold text-background rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : null}
            {uploading ? 'Traitement...' : 'Analyser'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
