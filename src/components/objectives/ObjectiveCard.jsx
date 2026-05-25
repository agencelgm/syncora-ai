import { motion } from 'framer-motion';
import { Target, Pencil, TrendingUp } from 'lucide-react';

const categoryColors = {
  financial: 'text-gold border-gold/30 bg-gold/10',
  health: 'text-success border-success/30 bg-success/10',
  learning: 'text-blue-electric border-blue-electric/30 bg-blue-electric/10',
  relationship: 'text-pink-400 border-pink-400/30 bg-pink-400/10',
  project: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  other: 'text-muted-foreground border-border bg-muted',
};

export default function ObjectiveCard({ objective, revenues, index, onEdit }) {
  const pct = objective.target_amount_fcfa > 0
    ? Math.min(100, Math.round((objective.current_amount_fcfa || 0) / objective.target_amount_fcfa * 100))
    : 0;

  const colors = categoryColors[objective.category] || categoryColors.other;

  const monthsLeft = objective.target_date
    ? Math.max(0, Math.round((new Date(objective.target_date) - new Date()) / (1000 * 60 * 60 * 24 * 30)))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-card rounded-2xl p-4 border border-border"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="font-semibold text-foreground">{objective.title}</p>
          {objective.description && (
            <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{objective.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors}`}>
            {objective.category}
          </span>
          <button onClick={onEdit} className="text-muted-foreground hover:text-foreground p-1">
            <Pencil size={14} />
          </button>
        </div>
      </div>

      {objective.target_amount_fcfa > 0 && (
        <>
          <div className="flex items-end justify-between mb-2">
            <p className="text-xl font-bold text-foreground">
              {(objective.current_amount_fcfa || 0).toLocaleString()} FCFA
            </p>
            <p className="text-muted-foreground text-sm">
              / {objective.target_amount_fcfa.toLocaleString()}
            </p>
          </div>
          <div className="bg-muted rounded-full h-1.5 mb-2">
            <div
              className="h-1.5 rounded-full bg-gold transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1 text-gold font-medium">
          <TrendingUp size={12} /> {pct}% accompli
        </span>
        {monthsLeft !== null && (
          <span>{monthsLeft} mois restants</span>
        )}
      </div>

      {objective.ai_strategy && (
        <div className="mt-3 p-3 bg-blue-electric/5 border border-blue-electric/20 rounded-xl">
          <p className="text-xs text-blue-electric/80 leading-relaxed">{objective.ai_strategy}</p>
        </div>
      )}
    </motion.div>
  );
}