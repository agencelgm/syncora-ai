import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, AlertTriangle, Zap } from 'lucide-react';

const priorityConfig = {
  critical: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30', label: 'Critique', icon: AlertTriangle },
  high: { color: 'text-gold', bg: 'bg-gold/10', border: 'border-gold/30', label: 'Haute', icon: Zap },
  medium: { color: 'text-blue-electric', bg: 'bg-blue-electric/10', border: 'border-blue-electric/30', label: 'Moyenne', icon: Clock },
  low: { color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-border', label: 'Faible', icon: Circle },
};

export default function TodayTaskCard({ task, index, onComplete }) {
  const config = priorityConfig[task.priority] || priorityConfig.medium;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100, scale: 0.9 }}
      transition={{ delay: index * 0.07 }}
      className={`bg-card rounded-2xl p-4 border ${config.border} relative overflow-hidden`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onComplete}
          className={`mt-0.5 flex-shrink-0 transition-all duration-200 ${config.color} hover:scale-110`}
        >
          <Circle size={22} strokeWidth={1.5} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-foreground font-medium leading-snug">{task.title}</p>
          {task.description && (
            <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
              {config.label}
            </span>
            {task.defer_count > 0 && (
              <span className="text-xs text-orange-400 font-medium">
                ⚠ Reporté {task.defer_count}x
              </span>
            )}
            {task.estimated_value_fcfa > 0 && (
              <span className="text-xs text-success font-medium">
                +{task.estimated_value_fcfa.toLocaleString()} F
              </span>
            )}
          </div>
          {task.ai_coaching_note && (
            <p className="text-xs text-gold/70 mt-2 italic">"{ task.ai_coaching_note}"</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}