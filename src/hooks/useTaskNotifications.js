import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { getCurrentUser } from './useCurrentUser';

// Vérifie chaque minute les tâches dont l'heure est arrivée (ou dans les 30s à venir)
// et déclenche un toast + une notification navigateur.
export default function useTaskNotifications() {
  const { toast } = useToast();
  const notifiedRef = useRef(new Set());

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const check = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const user = await getCurrentUser();
      const tasks = await base44.entities.Task.filter({ status: 'todo', due_date: today, created_by_id: user?.id });
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      for (const task of tasks) {
        if (!task.due_time || notifiedRef.current.has(task.id)) continue;

        const [h, m] = task.due_time.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) continue;
        const taskMinutes = h * 60 + m;

        // Déclenche dans une fenêtre de 0 à 1 minute après l'heure prévue
        if (nowMinutes >= taskMinutes && nowMinutes <= taskMinutes + 1) {
          notifiedRef.current.add(task.id);

          toast({
            title: `⏰ ${task.title}`,
            description: task.description || `C'est l'heure (${task.due_time}) de passer à l'action.`,
            duration: 8000,
          });

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`⏰ ${task.title}`, {
              body: task.description || `C'est l'heure de passer à l'action.`,
              icon: '/favicon.ico',
              tag: task.id,
            });
          }

          // Marquer côté DB pour éviter de re-notifier après rafraîchissement
          base44.entities.Task.update(task.id, { notified_at: now.toISOString() });
        }

        // Si déjà notifiée en DB aujourd'hui, ne pas re-notifier
        if (task.notified_at && task.notified_at.startsWith(today)) {
          notifiedRef.current.add(task.id);
        }
      }
    };

    check();
    const interval = setInterval(check, 30000); // toutes les 30s
    return () => clearInterval(interval);
  }, [toast]);
}