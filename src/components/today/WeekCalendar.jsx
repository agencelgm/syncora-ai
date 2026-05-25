import { motion } from 'framer-motion';
import { format, addDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function WeekCalendar({ tasks, selectedDate, onSelectDate }) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const tasksByDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return tasks.filter(t => t.due_date === dayStr).length;
  };

  return (
    <div className="mb-5">
      <p className="text-muted-foreground text-xs font-medium mb-2 px-1">Ma semaine</p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {days.map((day, i) => {
          const count = tasksByDay(day);
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectDate(day)}
              className={`flex flex-col items-center justify-center min-w-[52px] h-[68px] rounded-2xl border transition-all shrink-0 ${
                selected
                  ? 'bg-gold border-gold text-background'
                  : today
                  ? 'bg-card border-gold/40 text-foreground'
                  : 'bg-card border-border text-foreground'
              }`}
            >
              <span className={`text-[10px] uppercase font-medium ${selected ? 'text-background/70' : 'text-muted-foreground'}`}>
                {format(day, 'EEE', { locale: fr })}
              </span>
              <span className="text-lg font-bold leading-tight mt-0.5">{format(day, 'd')}</span>
              {count > 0 && (
                <span className={`text-[10px] mt-0.5 font-semibold ${selected ? 'text-background' : 'text-gold'}`}>
                  {count} {count > 1 ? 'tâches' : 'tâche'}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}