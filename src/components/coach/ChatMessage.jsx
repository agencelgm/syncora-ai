import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ChatMessage({ message, index }) {
  const isUser = message.role === 'user';

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
      <div className={`max-w-[82%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {message.image_url && (
          <img
            src={message.image_url}
            alt="Note partagée"
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
        {message.tasks_created?.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-success px-1">
            <CheckCircle2 size={11} />
            <span>{message.tasks_created.length} tâche{message.tasks_created.length > 1 ? 's' : ''} créée{message.tasks_created.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}