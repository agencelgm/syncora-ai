import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Eye, EyeOff, Save, Loader2 } from 'lucide-react';

export default function IntegrationSection({ profile, onUpdated }) {
  const [showGHL, setShowGHL] = useState(false);
  const [showChariow, setShowChariow] = useState(false);
  const [ghlKey, setGhlKey] = useState(profile?.gohighlevel_api_key || '');
  const [chariowKey, setChariowKey] = useState(profile?.chariow_api_key || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await base44.auth.updateMe({
        gohighlevel_api_key: ghlKey,
        chariow_api_key: chariowKey,
      });
      onUpdated();
    } catch (err) {
      setError('Impossible de sauvegarder les clés API.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">GoHighLevel API Key</label>
        <div className="relative">
          <input
            type={showGHL ? 'text' : 'password'}
            value={ghlKey}
            onChange={(e) => setGhlKey(e.target.value)}
            placeholder="Paste your GoHighLevel API key"
            className="w-full bg-muted rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground text-sm outline-none border border-transparent focus:border-gold/50 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowGHL(!showGHL)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showGHL ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Chariow API Key</label>
        <div className="relative">
          <input
            type={showChariow ? 'text' : 'password'}
            value={chariowKey}
            onChange={(e) => setChariowKey(e.target.value)}
            placeholder="Paste your Chariow API key"
            className="w-full bg-muted rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground text-sm outline-none border border-transparent focus:border-gold/50 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowChariow(!showChariow)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showChariow ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-gold text-background rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saving ? 'Sauvegarde...' : 'Sauvegarder les clés'}
      </button>
    </div>
  );
}