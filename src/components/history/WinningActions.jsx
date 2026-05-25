import { Trophy, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WinningActions({ actions }) {
  if (actions.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-center mb-5">
        <Trophy size={28} className="text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Aucune action n'a encore été liée à un revenu sur cette période.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Lors de l'ajout d'un revenu, lie-le à la tâche qui l'a généré.
        </p>
      </div>
    );
  }

  const max = Math.max(...actions.map(a => a.total));

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={16} className="text-gold" />
        <h3 className="text-sm font-bold text-foreground">Actions à fort impact</h3>
      </div>
      <div className="space-y-2">
        {actions.map((a, i) => (
          <motion.div
            key={a.key}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-card border border-border rounded-2xl p-3"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.count} fois · {a.total.toLocaleString()} FCFA</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-success shrink-0">
                <Zap size={12} />
                {Math.round((a.total / max) * 100)}%
              </div>
            </div>
            <div className="bg-background/40 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-gold to-success"
                style={{ width: `${(a.total / max) * 100}%` }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}