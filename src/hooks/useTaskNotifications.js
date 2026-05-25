import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { getCurrentUser } from './useCurrentUser';

// Verifie les rappels de taches sans declencher de prompt permission au chargement.
export default function useTaskNotifications() {
  const { toast } = useToast();
  const notifiedRef = useRef(new Set());

  useEffect(() => {
    const check = async () => {
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const user = await getCurrentUser();
        const tasks = await base44.entities.Task.filter({ status: 'todo', due_date: today, created_by_id: user?.id });
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        for (const task of tasks) {
          if (task.notified_at?.startsWith(today)) {
            notifiedRef.current.add(task.id);
          }
          if (!task.due_time || notifiedRef.current.has(task.id)) continue;

          const [h, m] = task.due_time.split(':').map(Number);
          if (isNaN(h) || isNaN(m)) continue;
          const taskMinutes = h * 60 + m;

          if (nowMinutes >= taskMinutes && nowMinutes <= taskMinutes + 1) {
            notifiedRef.current.add(task.id);

            toast({
              title: `Rappel: ${task.title}`,
              description: task.description || `C'est l'heure (${task.due_time}) de passer a l'action.`,
              duration: 8000,
            });

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`Rappel: ${task.title}`, {
                body: task.description || `C'est l'heure de passer a l'action.`,
                icon: '/favicon.ico',
                tag: task.id,
              });
            }

            await base44.entities.Task.update(task.id, { notified_at: now.toISOString() });
          }
        }
      } catch (err) {
        console.warn('Task notification check failed', err);
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [toast]);
}
