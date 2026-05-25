import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Eye, EyeOff, Loader2, Trash2, Plus } from 'lucide-react';
import { getCurrentUser } from '@/hooks/useCurrentUser';

export default function IntegrationSection({ onUpdated }) {
  const [ghlAccounts, setGhlAccounts] = useState([]);
  const [chariowAccounts, setChariowAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null); // 'gohighlevel' or 'chariow'
  const [newAccountName, setNewAccountName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newLocationId, setNewLocationId] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      const [ghl, chariow] = await Promise.all([
        base44.entities.IntegrationAccount.filter({ service: 'gohighlevel', created_by_id: user?.id }, '-created_date', 50),
        base44.entities.IntegrationAccount.filter({ service: 'chariow', created_by_id: user?.id }, '-created_date', 50),
      ]);
      setGhlAccounts(ghl);
      setChariowAccounts(chariow);
    } catch (err) {
      setError('Erreur lors du chargement des comptes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccountName.trim() || !newApiKey.trim() || !adding) return;
    
    setSaving(true);
    setError('');
    try {
      const payload = {
        service: adding,
        account_name: newAccountName,
        api_key: newApiKey,
      };
      if (adding === 'gohighlevel' && newLocationId.trim()) {
        payload.location_id = newLocationId;
      }
      await base44.entities.IntegrationAccount.create(payload);
      setNewAccountName('');
      setNewApiKey('');
      setNewLocationId('');
      setAdding(null);
      await loadAccounts();
      onUpdated?.();
    } catch (err) {
      setError('Impossible d\'ajouter le compte');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (id) => {
    try {
      await base44.entities.IntegrationAccount.delete(id);
      await loadAccounts();
      onUpdated?.();
    } catch (err) {
      setError('Impossible de supprimer le compte');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-gold" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* GoHighLevel */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground text-sm">GoHighLevel</h3>
          {adding !== 'gohighlevel' && (
            <button
              onClick={() => setAdding('gohighlevel')}
              className="text-xs bg-gold text-background rounded-lg px-3 py-1 flex items-center gap-1 font-medium"
            >
              <Plus size={12} /> Ajouter
            </button>
          )}
        </div>

        {adding === 'gohighlevel' && (
          <div className="bg-muted rounded-xl p-3 mb-3 space-y-2">
            <input
              type="text"
              placeholder="Nom du compte (ex: Mon agence)"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              className="w-full bg-card rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-gold/50"
            />
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="Clé API GoHighLevel"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                className="w-full bg-card rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-gold/50 pr-8"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <input
              type="text"
              placeholder="Location ID (optionnel)"
              value={newLocationId}
              onChange={(e) => setNewLocationId(e.target.value)}
              className="w-full bg-card rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-gold/50"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setAdding(null)}
                className="flex-1 text-xs bg-card border border-border text-muted-foreground rounded-lg py-2"
              >
                Annuler
              </button>
              <button
                onClick={handleAddAccount}
                disabled={saving || !newAccountName.trim() || !newApiKey.trim()}
                className="flex-1 text-xs bg-gold text-background rounded-lg py-2 font-medium disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Ajouter
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {ghlAccounts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Aucun compte GoHighLevel</p>
          ) : (
            ghlAccounts.map(acc => (
              <div key={acc.id} className="bg-card border border-border rounded-lg px-3 py-2.5 flex items-center justify-between">
                <span className="text-sm text-foreground font-medium">{acc.account_name}</span>
                <button
                  onClick={() => handleDeleteAccount(acc.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chariow */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground text-sm">Chariow</h3>
          {adding !== 'chariow' && (
            <button
              onClick={() => setAdding('chariow')}
              className="text-xs bg-gold text-background rounded-lg px-3 py-1 flex items-center gap-1 font-medium"
            >
              <Plus size={12} /> Ajouter
            </button>
          )}
        </div>

        {adding === 'chariow' && (
          <div className="bg-muted rounded-xl p-3 mb-3 space-y-2">
            <input
              type="text"
              placeholder="Nom du compte (ex: Compte principal)"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              className="w-full bg-card rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-gold/50"
            />
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="Clé API Chariow"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                className="w-full bg-card rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-gold/50 pr-8"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAdding(null)}
                className="flex-1 text-xs bg-card border border-border text-muted-foreground rounded-lg py-2"
              >
                Annuler
              </button>
              <button
                onClick={handleAddAccount}
                disabled={saving || !newAccountName.trim() || !newApiKey.trim()}
                className="flex-1 text-xs bg-gold text-background rounded-lg py-2 font-medium disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Ajouter
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {chariowAccounts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Aucun compte Chariow</p>
          ) : (
            chariowAccounts.map(acc => (
              <div key={acc.id} className="bg-card border border-border rounded-lg px-3 py-2.5 flex items-center justify-between">
                <span className="text-sm text-foreground font-medium">{acc.account_name}</span>
                <button
                  onClick={() => handleDeleteAccount(acc.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}
