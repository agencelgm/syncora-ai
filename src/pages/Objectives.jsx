import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Target, Plus, TrendingUp, TrendingDown, Zap, ChevronRight, DollarSign, Loader2 } from 'lucide-react';
import ObjectiveCard from '@/components/objectives/ObjectiveCard';
import ObjectiveForm from '@/components/objectives/ObjectiveForm';
import RevenueTracker from '@/components/objectives/RevenueTracker';

export default function Objectives() {
  const [objectives, setObjectives] = useState([]);
  const [revenues, setRevenues] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedObj, setSelectedObj] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('objectives');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [objs, revs] = await Promise.all([
      base44.entities.Objective.list('-created_date', 20),
      base44.entities.RevenueEntry.list('-date', 30),
    ]);
    setObjectives(objs);
    setRevenues(revs);
    setLoading(false);
  };

  const handleSaveObjective = async (data) => {
    if (selectedObj) {
      await base44.entities.Objective.update(selectedObj.id, data);
    } else {
      await base44.entities.Objective.create(data);
    }
    setShowForm(false);
    setSelectedObj(null);
    loadData();
  };

  const thisMonthRevenue = revenues
    .filter(r => r.date?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((sum, r) => sum + (r.amount_fcfa || 0), 0);

  const mainObjective = objectives.find(o => o.category === 'financial' && o.status === 'active');
  const monthlyTarget = mainObjective?.target_amount_fcfa
    ? Math.round(mainObjective.target_amount_fcfa / 12)
    : 0;

  return (
    <div className="px-4 pt-8 pb-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Objectifs</h1>
        <button
          onClick={() => { setSelectedObj(null); setShowForm(true); }}
          className="bg-gold text-background rounded-xl w-9 h-9 flex items-center justify-center shadow-lg shadow-gold/20"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Monthly overview */}
      {mainObjective && (
        <div className="bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 rounded-2xl p-4 mb-5">
          <p className="text-gold text-xs font-semibold mb-1">CE MOIS</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-black text-foreground">{thisMonthRevenue.toLocaleString()}</p>
              <p className="text-muted-foreground text-sm">sur {monthlyTarget.toLocaleString()} FCFA visés</p>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${thisMonthRevenue >= monthlyTarget ? 'text-success' : 'text-red-400'}`}>
                {monthlyTarget > 0 ? Math.round((thisMonthRevenue / monthlyTarget) * 100) : 0}%
              </p>
              <p className="text-muted-foreground text-xs">de l'objectif</p>
            </div>
          </div>
          <div className="mt-3 bg-background/40 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gold transition-all duration-700"
              style={{ width: `${Math.min(100, monthlyTarget > 0 ? (thisMonthRevenue / monthlyTarget) * 100 : 0)}%` }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {['objectives', 'revenues'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-sm font-medium py-2 rounded-xl transition-all ${tab === t ? 'bg-gold text-background' : 'bg-card border border-border text-muted-foreground'}`}
          >
            {t === 'objectives' ? 'Objectifs' : 'Revenus'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'objectives' ? (
        <div className="space-y-4">
          {objectives.map((obj, i) => (
            <ObjectiveCard
              key={obj.id}
              objective={obj}
              revenues={revenues}
              index={i}
              onEdit={() => { setSelectedObj(obj); setShowForm(true); }}
            />
          ))}
          {objectives.length === 0 && (
            <p className="text-center text-muted-foreground py-12 text-sm">Aucun objectif défini</p>
          )}
        </div>
      ) : (
        <RevenueTracker revenues={revenues} onRefresh={loadData} />
      )}

      {showForm && (
        <ObjectiveForm
          objective={selectedObj}
          onSave={handleSaveObjective}
          onClose={() => { setShowForm(false); setSelectedObj(null); }}
        />
      )}
    </div>
  );
}