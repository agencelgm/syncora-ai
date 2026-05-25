import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, subMonths, subWeeks, subYears } from 'date-fns';

const PRESETS = [
  { key: 'this_week', label: 'Cette semaine' },
  { key: 'last_week', label: 'Semaine dernière' },
  { key: 'this_month', label: 'Ce mois' },
  { key: 'last_month', label: 'Mois dernier' },
  { key: 'last_3_months', label: '3 derniers mois' },
  { key: 'this_year', label: 'Cette année' },
  { key: 'last_year', label: 'Année dernière' },
  { key: 'custom', label: 'Personnalisé' },
];

export const getPeriodRange = (preset, custom) => {
  const now = new Date();
  switch (preset) {
    case 'this_week': return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'last_week': {
      const lw = subWeeks(now, 1);
      return { from: startOfWeek(lw, { weekStartsOn: 1 }), to: endOfWeek(lw, { weekStartsOn: 1 }) };
    }
    case 'this_month': return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'last_month': {
      const lm = subMonths(now, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
    case 'last_3_months': return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) };
    case 'this_year': return { from: startOfYear(now), to: endOfYear(now) };
    case 'last_year': {
      const ly = subYears(now, 1);
      return { from: startOfYear(ly), to: endOfYear(ly) };
    }
    case 'custom':
      return {
        from: custom?.from ? new Date(custom.from) : startOfMonth(now),
        to: custom?.to ? new Date(custom.to) : endOfMonth(now),
      };
    default: return { from: startOfMonth(now), to: endOfMonth(now) };
  }
};

export default function PeriodSelector({ preset, custom, onChange }) {
  const [open, setOpen] = useState(false);
  const label = PRESETS.find(p => p.key === preset)?.label || 'Période';

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 text-sm"
      >
        <span className="flex items-center gap-2 text-foreground">
          <Calendar size={16} className="text-gold" />
          <span className="font-medium">{label}</span>
        </span>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 mt-2">
              {PRESETS.map(p => (
                <button
                  key={p.key}
                  onClick={() => { onChange(p.key, custom); if (p.key !== 'custom') setOpen(false); }}
                  className={`text-xs py-2 rounded-xl font-medium transition-all ${
                    preset === p.key ? 'bg-gold text-background' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {preset === 'custom' && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  type="date"
                  value={custom?.from || ''}
                  onChange={e => onChange('custom', { ...custom, from: e.target.value })}
                  className="bg-muted rounded-xl px-3 py-2 text-foreground text-xs outline-none"
                />
                <input
                  type="date"
                  value={custom?.to || ''}
                  onChange={e => onChange('custom', { ...custom, to: e.target.value })}
                  className="bg-muted rounded-xl px-3 py-2 text-foreground text-xs outline-none"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}