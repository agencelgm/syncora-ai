import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ChatMessage({ message, index, onConfirmAction, actionLoadingId }) {
  const isUser = message.role === 'user';
  const isPendingAction = !isUser && message.agent_action_id && message.agent_action_status === 'pending';
  const isExecuting = actionLoadingId === message.agent_action_id;
  const isExecutedAction = !isUser && message.agent_action_status === 'executed';
  const isFailedAction = !isUser && message.agent_action_status === 'failed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}
    >
      {!isUser && (
        <div className="w-7 h-7 bg-gradient-to-br from-gold to-gold/60 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-background text-xs font-bold">M</span>
        </div>
      )}
      <div className={`max-w-[82%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        {message.image_url && (
          <img
            src={message.image_url}
            alt="Note partagee"
            className="rounded-2xl max-h-48 object-cover w-full"
          />
        )}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-gold text-background rounded-tr-sm'
              : 'bg-card border border-border text-foreground rounded-tl-sm'
          }`}
        >
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-li:my-0">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {isPendingAction && (
          <div className="w-full bg-gold/10 border border-gold/30 rounded-xl p-3">
            <div className="flex items-start gap-2 mb-3">
              <ShieldCheck size={15} className="text-gold flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground">Confirmation requise</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {message.agent_action_summary || 'Confirme pour executer cette action.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onConfirmAction?.(message)}
              disabled={isExecuting}
              className="w-full bg-gold text-background rounded-lg px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isExecuting ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
              Confirmer
            </button>
          </div>
        )}

        {message.tasks_created?.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-success px-1">
            <CheckCircle2 size={11} />
            <span>{message.tasks_created.length} tache{message.tasks_created.length > 1 ? 's' : ''} creee{message.tasks_created.length > 1 ? 's' : ''}</span>
          </div>
        )}

        {isExecutedAction && !message.tasks_created?.length && (
          <div className="flex items-center gap-1 text-xs text-success px-1">
            <CheckCircle2 size={11} />
            <span>Action executee</span>
          </div>
        )}

        {isFailedAction && (
          <div className="flex items-center gap-1 text-xs text-destructive px-1">
            <TriangleAlert size={11} />
            <span>Action non executee</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
