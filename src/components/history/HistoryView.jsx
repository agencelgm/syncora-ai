import { useState, useMemo, useEffect } from 'react';
import { differenceInDays, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, startOfMonth, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import PeriodSelector, { getPeriodRange } from './PeriodSelector';
import HistoryStats from './HistoryStats';
import WinningActions from './WinningActions';
import EvolutionChart from './EvolutionChart';

const inRange = (dateStr, from, to) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= from && d <= to;
};

export default function HistoryView({ revenues, objectives }) {
  const [preset, setPreset] = useState('this_month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    base44.entities.Task.filter({ status: 'done' }, '-completed_at', 200).then(setTasks);
  }, []);

  const { from, to } = getPeriodRange(preset, custom);

  const stats = useMemo(() => {
    const days = Math.max(1, differenceInDays(to, from) + 1);
    const prevFrom = subDays(from, days);
    const prevTo = subDays(to, 1);

    const currentRevs = revenues.filter(r => inRange(r.date, from, to));
    const prevRevs = revenues.filter(r => inRange(r.date, prevFrom, prevTo));
    const currentTasks = tasks.filter(t => inRange(t.completed_at || t.updated_date, from, to));
    const prevTasks = tasks.filter(t => inRange(t.completed_at || t.updated_date, prevFrom, prevTo));

    return {
      current: {
        revenue: currentRevs.reduce((s, r) => s + (r.amount_fcfa || 0), 0),
        tasksDone: currentTasks.length,
      },
      previous: {
        revenue: prevRevs.reduce((s, r) => s + (r.amount_fcfa || 0), 0),
        tasksDone: prevTasks.length,
      },
      currentRevs,
    };
  }, [revenues, tasks, from, to]);

  const winningActions = useMemo(() => {
    const map = new Map();
    stats.currentRevs.forEach(r => {
      let label = r.action_label;
      let key = r.task_id || r.action_label;
      if (r.task_id) {
        const t = tasks.find(x => x.id === r.task_id);
        if (t) label = t.title;
      }
      if (!label) return;
      const existing = map.get(key) || { key, label, total: 0, count: 0 };
      existing.total += r.amount_fcfa || 0;
      existing.count += 1;
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [stats.currentRevs, tasks]);

  const { chartData, granularity } = useMemo(() => {
    const days = differenceInDays(to, from) + 1;
    let gran, points, formatter;
    if (days <= 14) {
      gran = 'day';
      points = eachDayOfInterval({ start: from, end: to });
      formatter = (d) => format(d, 'dd/MM');
    } else if (days <= 90) {
      gran = 'week';
      points = eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 });
      formatter = (d) => `S${format(d, 'w')}`;
    } else {
      gran = 'month';
      points = eachMonthOfInterval({ start: from, end: to });
      formatter = (d) => format(d, 'MMM', { locale: fr });
    }

    const data = points.map(p => {
      const bucketStart = gran === 'day' ? p : gran === 'week' ? startOfWeek(p, { weekStartsOn: 1 }) : startOfMonth(p);
      const bucketEnd = gran === 'day'
        ? new Date(p.getFullYear(), p.getMonth(), p.getDate(), 23, 59, 59)
        : gran === 'week'
          ? new Date(bucketStart.getTime() + 7 * 86400000 - 1)
          : new Date(p.getFullYear(), p.getMonth() + 1, 0, 23, 59, 59);
      const revenue = revenues
        .filter(r => inRange(r.date, bucketStart, bucketEnd))
        .reduce((s, r) => s + (r.amount_fcfa || 0), 0);
      return { label: formatter(p), revenue };
    });

    return { chartData: data, granularity: gran };
  }, [revenues, from, to]);

  return (
    <div>
      <PeriodSelector
        preset={preset}
        custom={custom}
        onChange={(p, c) => { setPreset(p); if (c) setCustom(c); }}
      />
      <HistoryStats current={stats.current} previous={stats.previous} />
      <EvolutionChart data={chartData} granularity={granularity} />
      <WinningActions actions={winningActions} />
    </div>
  );
}