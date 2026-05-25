import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { User, Zap, Mail, MessageCircle, Plus, X, Save, Loader2, ChevronRight, Bell } from 'lucide-react';

const SKILL_SUGGESTIONS = ['Coaching', 'Marketing digital', 'Vente', 'Copywriting', 'Formation', 'Consulting', 'Design', 'Développement', 'Finance', 'E-commerce'];
const DOMAIN_SUGGESTIONS = ['Business', 'Santé', 'Tech', 'Éducation', 'Immobilier', 'Mode', 'Food', 'Voyage', 'Personnel'];

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    bio: '',
    skills: [],
    domains: [],
    current_monthly_revenue_fcfa: '',
    target_monthly_revenue_fcfa: '',
    whatsapp_number: '',
    coaching_style_notes: '',
    monetization_ideas: [],
    daily_reminder_enabled: true,
  });
  const [newSkill, setNewSkill] = useState('');
  const [newIdea, setNewIdea] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const profiles = await base44.entities.UserProfile.list('-created_date', 1);
    if (profiles[0]) {
      setProfile(profiles[0]);
      setForm({
        full_name: profiles[0].full_name || '',
        bio: profiles[0].bio || '',
        skills: profiles[0].skills || [],
        domains: profiles[0].domains || [],
        current_monthly_revenue_fcfa: profiles[0].current_monthly_revenue_fcfa || '',
        target_monthly_revenue_fcfa: profiles[0].target_monthly_revenue_fcfa || '',
        whatsapp_number: profiles[0].whatsapp_number || '',
        coaching_style_notes: profiles[0].coaching_style_notes || '',
        monetization_ideas: profiles[0].monetization_ideas || [],
        daily_reminder_enabled: profiles[0].daily_reminder_enabled !== false,
      });
    }
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    const data = {
      ...form,
      current_monthly_revenue_fcfa: Number(form.current_monthly_revenue_fcfa) || 0,
      target_monthly_revenue_fcfa: Number(form.target_monthly_revenue_fcfa) || 0,
      onboarding_complete: true,
    };
    if (profile) {
      await base44.entities.UserProfile.update(profile.id, data);
    } else {
      const created = await base44.entities.UserProfile.create(data);
      setProfile(created);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleSkill = (s) => {
    setForm(p => ({
      ...p,
      skills: p.skills.includes(s) ? p.skills.filter(x => x !== s) : [...p.skills, s],
    }));
  };

  const toggleDomain = (d) => {
    setForm(p => ({
      ...p,
      domains: p.domains.includes(d) ? p.domains.filter(x => x !== d) : [...p.domains, d],
    }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !form.skills.includes(newSkill.trim())) {
      setForm(p => ({ ...p, skills: [...p.skills, newSkill.trim()] }));
      setNewSkill('');
    }
  };

  const addIdea = () => {
    if (newIdea.trim()) {
      setForm(p => ({ ...p, monetization_ideas: [...p.monetization_ideas, newIdea.trim()] }));
      setNewIdea('');
    }
  };

  const TABS = [
    { key: 'profile', label: 'Profil' },
    { key: 'revenue', label: 'Revenus' },
    { key: 'integrations', label: 'Connexions' },
  ];

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="px-4 pt-8 pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <button
          onClick={save}
          disabled={saving}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            saved ? 'bg-success text-white' : 'bg-gold text-background'
          }`}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? 'Sauvegardé !' : 'Sauvegarder'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 text-sm font-medium py-2 rounded-xl transition-all ${
              activeTab === t.key ? 'bg-gold text-background' : 'bg-card border border-border text-muted-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Identity */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <User size={16} className="text-gold" />
              <p className="font-semibold text-foreground text-sm">Identité</p>
            </div>
            <input
              type="text"
              placeholder="Ton prénom ou nom..."
              value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none border border-transparent focus:border-gold/50"
            />
            <textarea
              placeholder="Qui es-tu ? Ton histoire, ta mission, ce qui te motive..."
              value={form.bio}
              onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              rows={3}
              className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none border border-transparent focus:border-gold/50 resize-none"
            />
          </div>

          {/* Skills */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-gold" />
              <p className="font-semibold text-foreground text-sm">Compétences</p>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {SKILL_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSkill(s)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                    form.skills.includes(s) ? 'bg-gold text-background' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Autre compétence..."
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSkill()}
                className="flex-1 bg-muted rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground text-sm outline-none"
              />
              <button onClick={addSkill} className="bg-gold text-background rounded-xl px-3 py-2">
                <Plus size={14} />
              </button>
            </div>
            {form.skills.filter(s => !SKILL_SUGGESTIONS.includes(s)).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.skills.filter(s => !SKILL_SUGGESTIONS.includes(s)).map(s => (
                  <span key={s} className="flex items-center gap-1 text-xs bg-gold text-background px-3 py-1.5 rounded-full">
                    {s}
                    <button onClick={() => setForm(p => ({ ...p, skills: p.skills.filter(x => x !== s) }))}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Domains */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="font-semibold text-foreground text-sm mb-3">Domaines d'activité</p>
            <div className="flex flex-wrap gap-2">
              {DOMAIN_SUGGESTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => toggleDomain(d)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                    form.domains.includes(d) ? 'bg-blue-electric text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Coaching style */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="font-semibold text-foreground text-sm mb-2">Note pour le coach IA</p>
            <p className="text-muted-foreground text-xs mb-2">Ce contexte aide le coach à personnaliser ses conseils</p>
            <textarea
              placeholder="Ex: J'ai besoin d'être challengé fortement. Je procrastine sur les appels clients. Mon secteur est..."
              value={form.coaching_style_notes}
              onChange={e => setForm(p => ({ ...p, coaching_style_notes: e.target.value }))}
              rows={3}
              className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none border border-transparent focus:border-gold/50 resize-none"
            />
          </div>

          {/* Monetization ideas */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="font-semibold text-foreground text-sm mb-2">Idées de monétisation</p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Une idée de revenus..."
                value={newIdea}
                onChange={e => setNewIdea(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addIdea()}
                className="flex-1 bg-muted rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground text-sm outline-none"
              />
              <button onClick={addIdea} className="bg-gold text-background rounded-xl px-3 py-2">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {form.monetization_ideas.map((idea, i) => (
                <div key={i} className="flex items-center justify-between bg-muted rounded-xl px-3 py-2">
                  <span className="text-sm text-foreground">{idea}</span>
                  <button onClick={() => setForm(p => ({ ...p, monetization_ideas: p.monetization_ideas.filter((_, j) => j !== i) }))}>
                    <X size={12} className="text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'revenue' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <p className="font-semibold text-foreground text-sm">Situation actuelle</p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Revenus mensuels actuels (FCFA)</label>
              <input
                type="number"
                placeholder="Ex: 500000"
                value={form.current_monthly_revenue_fcfa}
                onChange={e => setForm(p => ({ ...p, current_monthly_revenue_fcfa: e.target.value }))}
                className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none border border-transparent focus:border-gold/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Objectif mensuel cible (FCFA)</label>
              <input
                type="number"
                placeholder="Ex: 5000000"
                value={form.target_monthly_revenue_fcfa}
                onChange={e => setForm(p => ({ ...p, target_monthly_revenue_fcfa: e.target.value }))}
                className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none border border-transparent focus:border-gold/50"
              />
            </div>
          </div>

          {form.current_monthly_revenue_fcfa && form.target_monthly_revenue_fcfa && (
            <div className="bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 rounded-2xl p-4">
              <p className="text-gold text-xs font-semibold mb-1">MULTIPLICATEUR</p>
              <p className="text-3xl font-black text-foreground">
                ×{(Number(form.target_monthly_revenue_fcfa) / Number(form.current_monthly_revenue_fcfa)).toFixed(1)}
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                De {Number(form.current_monthly_revenue_fcfa).toLocaleString()} à {Number(form.target_monthly_revenue_fcfa).toLocaleString()} FCFA/mois
              </p>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'integrations' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {/* WhatsApp */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center">
                <MessageCircle size={18} className="text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">WhatsApp</p>
                <p className="text-xs text-muted-foreground">Reçois ton briefing et ajoute des tâches par message</p>
              </div>
            </div>
            <input
              type="tel"
              placeholder="+237 6XX XXX XXX"
              value={form.whatsapp_number}
              onChange={e => setForm(p => ({ ...p, whatsapp_number: e.target.value }))}
              className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none border border-transparent focus:border-gold/50 mb-2"
            />
            <p className="text-xs text-muted-foreground">
              💡 Une fois ton numéro sauvegardé, demande à ton coach IA comment activer la connexion WhatsApp.
            </p>
          </div>

          {/* Email */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-blue-electric/10 rounded-xl flex items-center justify-center">
                <Mail size={18} className="text-blue-electric" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Email</p>
                <p className="text-xs text-muted-foreground">Résumé hebdomadaire et rappels automatiques</p>
              </div>
            </div>
            <div className="bg-muted/50 border border-border rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Connecté via ton compte app</span>
              <span className="text-xs text-success font-medium">✓ Actif</span>
            </div>
          </div>

          {/* Daily reminder */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-gold/10 rounded-xl flex items-center justify-center">
                <Bell size={18} className="text-gold" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">Rappel quotidien du soir</p>
                <p className="text-xs text-muted-foreground">Email chaque jour à 19h : objectifs + rappel revenus</p>
              </div>
            </div>
            <button
              onClick={() => setForm(p => ({ ...p, daily_reminder_enabled: !p.daily_reminder_enabled }))}
              className={`w-full rounded-xl px-4 py-3 flex items-center justify-between transition-all ${
                form.daily_reminder_enabled ? 'bg-success/10 border border-success/30' : 'bg-muted/50 border border-border'
              }`}
            >
              <span className={`text-sm font-medium ${form.daily_reminder_enabled ? 'text-success' : 'text-muted-foreground'}`}>
                {form.daily_reminder_enabled ? '✓ Rappels activés' : 'Rappels désactivés'}
              </span>
              <div className={`w-10 h-6 rounded-full transition-all relative ${form.daily_reminder_enabled ? 'bg-success' : 'bg-muted'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${form.daily_reminder_enabled ? 'left-[18px]' : 'left-0.5'}`} />
              </div>
            </button>
          </div>

          {/* Info */}
          <div className="bg-muted/30 rounded-2xl p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              🔒 Tes données restent privées. Les connexions externes (WhatsApp, email) te permettent de recevoir des résumés et d'interagir avec ton coach sans ouvrir l'app.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}