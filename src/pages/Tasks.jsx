import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Filter, CheckCircle2, Clock, AlertTriangle, Zap, Circle, RotateCcw, Trash2 } from 'lucide-react';
import TaskForm from '@/components/tasks/TaskForm';
import TaskItem from '@/components/tasks/TaskItem';

const FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'todo', label: 'À faire' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'done', label: 'Faites' },
  { key: 'deferred', label: 'Reportées' },
];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('todo');
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    const data = await base44.entities.Task.list('-ai_priority_score', 100);
    setTasks(data);
    setLoading(false);
  };

  const handleSave = async (taskData) => {
    if (editTask) {
      await base44.entities.Task.update(editTask.id, taskData);
    } else {
      await base44.entities.Task.create(taskData);
    }
    setShowForm(false);
    setEditTask(null);
    loadTasks();
  };

  const handleComplete = async (task) => {
    await base44.entities.Task.update(task.id, { status: 'done', completed_at: new Date().toISOString() });
    loadTasks();
  };

  const handleDefer = async (task) => {
    await base44.entities.Task.update(task.id, { status: 'deferred', defer_count: (task.defer_count || 0) + 1 });
    loadTasks();
  };

  const handleDelete = async (task) => {
    await base44.entities.Task.delete(task.id);
    loadTasks();
  };

  const filtered = tasks.filter(t => filter === 'all' || t.status === filter);
  const sortedByPriority = [...filtered].sort((a, b) => (b.ai_priority_score || 0) - (a.ai_priority_score || 0));

  return (
    <div className="px-4 pt-8 pb-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Tâches</h1>
        <button
          onClick={() => { setEditTask(null); setShowForm(true); }}
          className="bg-gold text-background rounded-xl w-9 h-9 flex items-center justify-center shadow-lg shadow-gold/20"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
              filter === f.key
                ? 'bg-gold text-background'
                : 'bg-card border border-border text-muted-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {sortedByPriority.length === 0 ? (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-muted-foreground py-12 text-sm">
                Aucune tâche dans cette catégorie
              </motion.p>
            ) : (
              sortedByPriority.map((task, i) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  index={i}
                  onComplete={() => handleComplete(task)}
                  onDefer={() => handleDefer(task)}
                  onDelete={() => handleDelete(task)}
                  onEdit={() => { setEditTask(task); setShowForm(true); }}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <TaskForm
            task={editTask}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditTask(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}