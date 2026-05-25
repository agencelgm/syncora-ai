import { motion } from 'framer-motion';
import { CheckCircle2, Circle, RotateCcw, Trash2, Pencil } from 'lucide-react';

const priorityConfig = {
  critical: { color: 'text-red-400', dot: 'bg-red-400', label: 'Critique' },
  high: { color: 'text-gold', dot: 'bg-gold', label: 'Haute' },
  medium: { color: 'text-blue-electric', dot: 'bg-blue-electric', label: 'Moyenne' },
  low: { color: 'text-muted-foreground', dot: 'bg-muted-foreground', label: 'Faible' },
};

export default function TaskItem({ task, index, onComplete, onDefer, onDelete, onEdit }) {
  const config = priorityConfig[task.priority] || priorityConfig.medium;
  const isDone = task.status === 'done';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -80 }}
      transition={{ delay: index * 0.04 }}
      className="bg-card rounded-2xl p-4 border border-border"
    >
      <div className="flex items-start gap-3">
        <button
          onClick={!isDone ? onComplete : undefined}
          aria-label={isDone ? 'Tâche faite' : 'Marquer comme faite'}
          className="flex-shrink-0 min-w-[44px] min-h-[44px] -ml-2 flex items-center justify-center"
        >
          {isDone
            ? <CheckCircle2 size={20} className="text-success" />
            : <Circle size={20} className={config.color} strokeWidth={1.8} />
          }
        </button>
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="flex items-center gap-1 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
              <span className={config.color}>{config.label}</span>
            </span>
            {task.defer_count > 0 && (
              <span className="text-xs text-orange-400">⚠ Reporté {task.defer_count}x</span>
            )}
            {task.due_date && (
              <span className="text-xs text-muted-foreground">{task.due_date}</span>
            )}
            {task.estimated_value_fcfa > 0 && (
              <span className="text-xs text-success">+{task.estimated_value_fcfa.toLocaleString()} F</span>
            )}
          </div>
          {task.ai_coaching_note && (
            <p className="text-xs text-gold/60 mt-1.5 italic">"{task.ai_coaching_note}"</p>
          )}
        </div>
        <div className="flex flex-col gap-0.5 flex-shrink-0 -mr-2">
          {!isDone && (
            <>
              <button
                onClick={onDefer}
                aria-label="Reporter"
                className="text-muted-foreground hover:text-orange-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={onEdit}
                aria-label="Modifier"
                className="text-muted-foreground hover:text-blue-electric transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Pencil size={16} />
              </button>
            </>
          )}
          <button
            onClick={onDelete}
            aria-label="Supprimer"
            className="text-muted-foreground hover:text-destructive transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
