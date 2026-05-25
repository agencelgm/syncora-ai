import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, Link2 } from 'lucide-react';

export default function TaskPickerDrawer({ open, onClose, tasks, selectedId, onSelect }) {
  const [search, setSearch] = useState('');
  const filtered = tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  const pick = (id) => {
    onSelect(id);
    onClose();
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
            className="w-full max-w-md mx-auto bg-card rounded-t-3xl border-t border-border max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <div className="flex items-center gap-2">
                <Link2 size={16} className="text-gold" />
                <h3 className="font-bold text-foreground">Choisir une action</h3>
              </div>
              <button onClick={onClose} className="text-muted-foreground"><X size={20} /></button>
            </div>

            <div className="px-6 pb-3">
              <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                <Search size={14} className="text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <button
                onClick={() => pick('')}
                className={`w-full text-left px-3 py-3 rounded-xl flex items-center justify-between text-sm ${
                  !selectedId ? 'bg-gold/10 text-gold' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <span>— Aucune tâche liée —</span>
                {!selectedId && <Check size={14} />}
              </button>
              {filtered.map(t => (
                <button
                  key={t.id}
                  onClick={() => pick(t.id)}
                  className={`w-full text-left px-3 py-3 rounded-xl flex items-center justify-between text-sm ${
                    selectedId === t.id ? 'bg-gold/10 text-gold' : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <span className="truncate pr-2">{t.title}</span>
                  {selectedId === t.id && <Check size={14} className="shrink-0" />}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground text-xs py-6">Aucune tâche trouvée</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}