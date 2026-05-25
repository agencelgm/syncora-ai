import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Plus, X, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function QuickRevenueEntry({ onAdded }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    if (!amount) return;
    await base44.entities.RevenueEntry.create({
      amount_fcfa: Number(amount),
      date: format(new Date(), 'yyyy-MM-dd'),
      source: source || 'Non précisé',
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setOpen(false);
      setAmount('');
      setSource('');
      onAdded?.();
    }, 1200);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-success/10 border border-success/30 text-success rounded-2xl px-4 py-3 text-sm font-medium w-full"
      >
        <Plus size={16} />
        <span>Ajouter un revenu d'aujourd'hui</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-md mx-auto bg-card rounded-t-3xl p-6 border-t border-border"
              onClick={e => e.stopPropagation()}
            >
              {saved ? (
                <div className="flex flex-col items-center py-6 gap-3">
                  <CheckCircle2 size={40} className="text-success" />
                  <p className="font-bold text-foreground">Revenu enregistré !</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign size={18} className="text-success" />
                      <h3 className="font-bold text-foreground">Revenu du jour</h3>
                    </div>
                    <button onClick={() => setOpen(false)} className="text-muted-foreground"><X size={20} /></button>
                  </div>

                  <input
                    type="number"
                    placeholder="Montant (FCFA)"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    autoFocus
                    className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-lg font-bold outline-none border border-transparent focus:border-success/50 mb-3"
                  />
                  <input
                    type="text"
                    placeholder="Source (client, projet, formation...)"
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none border border-transparent focus:border-success/50 mb-4"
                  />
                  <button
                    onClick={submit}
                    disabled={!amount}
                    className="w-full bg-success text-white rounded-xl py-3 text-sm font-bold disabled:opacity-50"
                  >
                    Enregistrer
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}