import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function EvolutionChart({ data, granularity }) {
  if (data.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={16} className="text-blue-electric" />
        <h3 className="text-sm font-bold text-foreground">Évolution {granularity === 'day' ? 'quotidienne' : granularity === 'week' ? 'hebdomadaire' : granularity === 'month' ? 'mensuelle' : 'annuelle'}</h3>
      </div>
      <div className="h-48 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              formatter={(v) => [`${v.toLocaleString()} FCFA`, 'Revenu']}
            />
            <Line type="monotone" dataKey="revenue" stroke="hsl(var(--gold))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--gold))', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}