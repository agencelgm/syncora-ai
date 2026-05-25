import { TrendingUp, TrendingDown, Minus, DollarSign, CheckCircle2, Target } from 'lucide-react';

const fmt = (n) => Math.round(n).toLocaleString();

export default function HistoryStats({ current, previous }) {
  const revenueDelta = previous.revenue > 0
    ? ((current.revenue - previous.revenue) / previous.revenue) * 100
    : current.revenue > 0 ? 100 : 0;
  const tasksDelta = previous.tasksDone > 0
    ? ((current.tasksDone - previous.tasksDone) / previous.tasksDone) * 100
    : current.tasksDone > 0 ? 100 : 0;

  const Trend = ({ value }) => {
    const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
    const color = value > 0 ? 'text-success' : value < 0 ? 'text-red-400' : 'text-muted-foreground';
    return (
      <div className={`flex items-center gap-1 text-xs font-semibold ${color}`}>
        <Icon size={12} />
        <span>{value > 0 ? '+' : ''}{Math.round(value)}%</span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <DollarSign size={16} className="text-success" />
          <Trend value={revenueDelta} />
        </div>
        <p className="text-xl font-black text-foreground">{fmt(current.revenue)}</p>
        <p className="text-xs text-muted-foreground">FCFA générés</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <CheckCircle2 size={16} className="text-gold" />
          <Trend value={tasksDelta} />
        </div>
        <p className="text-xl font-black text-foreground">{current.tasksDone}</p>
        <p className="text-xs text-muted-foreground">actions complétées</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 col-span-2">
        <div className="flex items-center gap-2 mb-2">
          <Target size={16} className="text-blue-electric" />
          <p className="text-xs text-muted-foreground">Période précédente comparable</p>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Revenu: <span className="text-foreground font-semibold">{fmt(previous.revenue)} FCFA</span></span>
          <span className="text-muted-foreground">Tâches: <span className="text-foreground font-semibold">{previous.tasksDone}</span></span>
        </div>
      </div>
    </div>
  );
}