import { Flame } from 'lucide-react';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function StreakBadge() {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    base44.entities.JournalEntry.list('-date', 30).then(entries => {
      let s = 0;
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        if (entries.find(e => e.date === ds)) s++;
        else break;
      }
      setStreak(s);
    });
  }, []);

  if (streak === 0) return null;

  return (
    <div className="flex items-center gap-1 bg-gold/10 border border-gold/30 rounded-xl px-3 py-1.5">
      <Flame size={14} className="text-gold" />
      <span className="text-gold text-xs font-bold">{streak}</span>
    </div>
  );
}