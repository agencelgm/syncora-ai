import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Flame, TrendingUp, Zap, ChevronRight, Plus } from 'lucide-react';
import { format, isToday as isDateToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import DailyBriefing from '@/components/today/DailyBriefing';
import TodayTaskCard from '@/components/today/TodayTaskCard';
import StreakBadge from '@/components/today/StreakBadge';
import ProgressRing from '@/components/today/ProgressRing';
import QuickRevenueEntry from '@/components/today/QuickRevenueEntry';
import WeekCalendar from '@/components/today/WeekCalendar';
import PullToRefresh from '@/components/common/PullToRefresh';

export default function Today() {
  const [tasks, setTasks] = useState([]);
  const [completedToday, setCompletedToday] = useState(0);
  const [profile, setProfile] = useState(null);
  const [objectives, setObjectives] = useState([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const [allTasks, doneTasks, profileData, objData, revData] = await Promise.all([
      base44.entities.Task.filter({ status: 'todo' }, '-ai_priority_score', 10),
      base44.entities.Task.filter({ status: 'done' }, '-completed_at', 50),
      base44.entities.UserProfile.list('-created_date', 1),
      base44.entities.Objective.filter({ status: 'active' }, '-created_date', 3),
      base44.entities.RevenueEntry.filter({ date: today }, '-created_date', 20),
    ]);
    setTasks(allTasks);
    setCompletedToday(doneTasks.filter(t => t.completed_at?.startsWith(today)).length);
    setProfile(profileData[0] || null);
    setObjectives(objData);
    setTodayRevenue(revData.reduce((sum, r) => sum + (r.amount_fcfa || 0), 0));
    setLoading(false);
  };

  const completeTask = async (task) => {
    // Mise à jour optimiste : UI snappy avant l'appel API
    setTasks(prev => prev.filter(t => t.id !== task.id));
    setCompletedToday(c => c + 1);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 }, colors: ['#F5A623', '#3B82F6', '#10B981'] });
    await base44.entities.Task.update(task.id, {
      status: 'done',
      completed_at: new Date().toISOString(),
    });
  };

  const isSelectedToday = isDateToday(selectedDate);
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const todayTasks = isSelectedToday
    ? tasks.slice(0, 5)
    : tasks.filter(t => t.due_date === selectedDateStr);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="px-4 pt-8 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-muted-foreground text-sm">{format(new Date(), 'EEEE d MMMM', { locale: fr })}</p>
          <h1 className="text-2xl font-bold text-foreground">
            Bonjour{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
          </h1>
        </div>
        <StreakBadge />
      </div>

      {/* Progress summary */}
      <div className="bg-card rounded-2xl p-4 mb-5 border border-border flex items-center gap-4">
        <ProgressRing total={todayTasks.length + completedToday} done={completedToday} />
        <div className="flex-1">
          <p className="text-foreground font-semibold">{completedToday} tâches accomplies</p>
          <p className="text-muted-foreground text-sm">{todayTasks.length} restantes aujourd'hui</p>
          {objectives[0] && (
            <div className="mt-2 flex items-center gap-1 text-gold text-xs font-medium">
              <TrendingUp size={12} />
              <span>Objectif : {objectives[0].title}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setBriefingOpen(true)}
          className="bg-gold/10 border border-gold/30 text-gold rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
        >
          <Zap size={12} /> Briefing
        </button>
      </div>

      {/* Week calendar */}
      <WeekCalendar tasks={tasks} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      {/* Today's priority tasks */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-foreground font-semibold flex items-center gap-2">
          <Flame size={16} className="text-gold" />
          {isSelectedToday ? 'Priorités du jour' : `Tâches du ${format(selectedDate, 'EEEE d', { locale: fr })}`}
        </h2>
        <Link to="/tasks" className="text-muted-foreground text-xs flex items-center gap-1">
          Tout voir <ChevronRight size={14} />
        </Link>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {todayTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-10 text-muted-foreground"
            >
              <CheckCircle2 size={40} className="mx-auto mb-2 text-success" />
              <p className="font-semibold text-foreground">Tout est fait ! 🎉</p>
              <p className="text-sm">Tu écrases la journée.</p>
            </motion.div>
          ) : (
            todayTasks.map((task, i) => (
              <TodayTaskCard key={task.id} task={task} index={i} onComplete={() => completeTask(task)} />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Quick add task */}
      <Link to="/tasks" className="mt-5 flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-dashed border-border text-muted-foreground text-sm hover:border-gold/50 hover:text-gold transition-all">
        <Plus size={16} /> Ajouter une tâche
      </Link>

      {/* Revenue today */}
      <div className="mt-4">
        {todayRevenue > 0 && (
          <div className="bg-success/10 border border-success/30 rounded-2xl px-4 py-3 mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-success font-semibold">REVENUS AUJOURD'HUI</p>
              <p className="text-xl font-black text-foreground">+{todayRevenue.toLocaleString()} FCFA</p>
            </div>
            <Link to="/objectives" className="text-xs text-muted-foreground flex items-center gap-1">
              Voir tout <ChevronRight size={12} />
            </Link>
          </div>
        )}
        <QuickRevenueEntry onAdded={loadData} />
      </div>

      <DailyBriefing open={briefingOpen} onClose={() => setBriefingOpen(false)} tasks={tasks} objectives={objectives} />
    </div>
    </PullToRefresh>
  );
}