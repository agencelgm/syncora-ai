import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { subMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function MonthlyRevenueChart({ revenues, monthlyTarget }) {
  // Construit les 6 derniers mois
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const key = format(d, 'yyyy-MM');
    const label = format(d, 'MMM', { locale: fr });
    const total = revenues
      .filter(r => r.date?.startsWith(key))
      .reduce((sum, r) => sum + (r.amount_fcfa || 0), 0);
    return { key, label, revenue: total, target: monthlyTarget || 0 };
  });

  const hasData = months.some(m => m.revenue > 0);
  const max = Math.max(...months.map(m => m.revenue), monthlyTarget || 0);

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-gold" />
          <h3 className="font-semibold text-foreground text-sm">Évolution mensuelle</h3>
        </div>
        {monthlyTarget > 0 && (
          <p className="text-xs text-muted-foreground">
            Cible : <span className="text-gold font-semibold">{monthlyTarget.toLocaleString()} F</span>
          </p>
        )}
      </div>

      {!hasData ? (
        <p className="text-center text-muted-foreground text-xs py-10">Pas encore assez de revenus pour afficher le graphique</p>
      ) : (
        <div className="h-52 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={months} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : v}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                formatter={(value, name) => [
                  `${Number(value).toLocaleString()} FCFA`,
                  name === 'revenue' ? 'Revenu' : 'Cible',
                ]}
              />
              <Bar dataKey="revenue" fill="hsl(var(--gold))" radius={[6, 6, 0, 0]} maxBarSize={36} />
              {monthlyTarget > 0 && (
                <ReferenceLine
                  y={monthlyTarget}
                  stroke="hsl(var(--blue-electric))"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {monthlyTarget > 0 && hasData && (
        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-gold rounded-sm" />
            <span className="text-muted-foreground">Revenus</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-electric" style={{ borderTop: '2px dashed hsl(var(--blue-electric))', background: 'transparent' }} />
            <span className="text-muted-foreground">Objectif mensuel</span>
          </div>
        </div>
      )}
    </div>
  );
}