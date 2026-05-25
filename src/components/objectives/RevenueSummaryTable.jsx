import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Table2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function RevenueSummaryTable({ revenues }) {
  const [expanded, setExpanded] = useState({});

  // Groupe par source
  const grouped = revenues.reduce((acc, r) => {
    const source = r.source?.trim() || 'Sans source';
    if (!acc[source]) acc[source] = { entries: [], total: 0 };
    acc[source].entries.push(r);
    acc[source].total += r.amount_fcfa || 0;
    return acc;
  }, {});

  const sortedSources = Object.entries(grouped).sort((a, b) => b[1].total - a[1].total);
  const grandTotal = revenues.reduce((sum, r) => sum + (r.amount_fcfa || 0), 0);

  const toggle = (source) => setExpanded(p => ({ ...p, [source]: !p[source] }));

  if (revenues.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Table2 size={16} className="text-gold" />
          <h3 className="font-semibold text-foreground text-sm">Récap par source</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Total : <span className="text-success font-bold">{grandTotal.toLocaleString()} F</span>
        </p>
      </div>

      <div className="divide-y divide-border">
        {sortedSources.map(([source, { entries, total }]) => {
          const isOpen = expanded[source];
          const share = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
          return (
            <div key={source}>
              <button
                onClick={() => toggle(source)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {isOpen ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm font-medium truncate">{source}</p>
                    <p className="text-muted-foreground text-[11px]">{entries.length} entrée{entries.length > 1 ? 's' : ''} · {share.toFixed(0)}%</p>
                  </div>
                </div>
                <p className="text-success text-sm font-bold ml-2 shrink-0">+{total.toLocaleString()} F</p>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden bg-background/40"
                  >
                    <div className="px-4 py-2">
                      {entries
                        .slice()
                        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                        .map(e => (
                          <div key={e.id} className="flex items-center justify-between py-1.5 text-xs">
                            <div className="text-muted-foreground">
                              {e.date ? format(parseISO(e.date), 'd MMM yyyy', { locale: fr }) : '—'}
                              {e.action_label && <span className="text-foreground/70"> · {e.action_label}</span>}
                            </div>
                            <span className="text-foreground font-semibold">{e.amount_fcfa?.toLocaleString()} F</span>
                          </div>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}