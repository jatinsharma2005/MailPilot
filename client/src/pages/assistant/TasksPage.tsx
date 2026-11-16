import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckSquare, Calendar, Plus, Trash2, CheckCircle2, Clock, MapPin, Users } from 'lucide-react';
import { api } from '../../services/api.js';
import { Task } from '../../types/index.js';
import { Modal } from '../../components/common/Modal.js';

export const TasksPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') === 'meetings' ? 'meetings' : 'tasks';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newType, setNewType] = useState<'FOLLOW_UP' | 'MEETING'>('FOLLOW_UP');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks');
      setTasks(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleToggleTask = async (task: Task) => {
    const newStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    setTasks((prev) =>
      prev.map((t) => (t._id === task._id ? { ...t, status: newStatus } : t))
    );
    try {
      await api.patch(`/tasks/${task._id}`, { status: newStatus });
    } catch {
      fetchTasks();
    }
  };

  const handleDeleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t._id !== id));
    try {
      await api.delete(`/tasks/${id}`);
    } catch {
      fetchTasks();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await api.post('/tasks', {
        title: newTitle,
        description: newDesc,
        dueDate: newDate ? new Date(newDate) : undefined,
        type: newType,
        assignedTo: 'ASSISTANT',
      });
      setTasks((prev) => [res.data.data, ...prev]);
      setCreateModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewDate('');
    } catch (err) {
      console.error(err);
    }
  };

  const followupsList = tasks.filter((t) => t.type !== 'MEETING');
  const meetingsList = tasks.filter((t) => t.type === 'MEETING');

  return (
    <div className="mailpilot-tasks-page space-y-6 max-w-5xl mx-auto animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-main">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Operational Calendar & Tasks</h1>
          <p className="text-xs text-text-secondary mt-0.5">Manage pending client follow-ups and AI-extracted meetings</p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-3.5 py-2 rounded-card bg-forest text-white text-xs font-medium hover:bg-forest-hover transition-colors shadow-subtle flex items-center gap-1.5"
        >
          <Plus size={14} />
          <span>New Follow-up Task</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="mailpilot-task-tabs flex gap-2 border-b border-border-main text-xs">
        <button
          onClick={() => setSearchParams({ tab: 'tasks' })}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 ${
            currentTab === 'tasks'
              ? 'border-b-2 border-forest text-forest'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <CheckSquare size={14} />
          <span>Pending Follow-ups ({followupsList.length})</span>
        </button>

        <button
          onClick={() => setSearchParams({ tab: 'meetings' })}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 ${
            currentTab === 'meetings'
              ? 'border-b-2 border-forest text-forest'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Calendar size={14} />
          <span>Extracted Meetings & Calls ({meetingsList.length})</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-12 text-center text-xs text-text-secondary flex flex-col items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-forest border-t-transparent rounded-full animate-spin"></div>
          <span>Loading items...</span>
        </div>
      ) : currentTab === 'tasks' ? (
        <div className="bg-surface-main rounded-card border border-border-main shadow-card divide-y divide-border-main">
          {followupsList.length === 0 ? (
            <p className="p-8 text-center text-xs text-text-secondary">No pending follow-ups found.</p>
          ) : (
            followupsList.map((task) => (
              <div key={task._id} className="p-4 flex items-center justify-between gap-4 hover:bg-bg-primary/40 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={() => handleToggleTask(task)}
                    className="mt-0.5 text-text-secondary hover:text-forest transition-colors shrink-0"
                  >
                    <CheckCircle2
                      size={18}
                      className={task.status === 'COMPLETED' ? 'text-forest fill-forest-soft' : ''}
                    />
                  </button>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold text-text-primary truncate ${
                        task.status === 'COMPLETED' ? 'line-through text-text-secondary' : ''
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-[11px] text-text-secondary mt-0.5">{task.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {task.dueDate && (
                    <span className="text-[11px] text-text-secondary flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteTask(task._id)}
                    className="p-1 text-text-secondary hover:text-status-error transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meetingsList.length === 0 ? (
            <p className="col-span-2 p-8 text-center text-xs text-text-secondary bg-surface-main rounded-card border border-border-main">
              No meetings currently extracted from emails.
            </p>
          ) : (
            meetingsList.map((m) => (
              <div key={m._id} className="p-5 bg-surface-main rounded-card border border-border-main shadow-card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-text-primary">{m.meetingDetails?.title || m.title}</h3>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-forest-soft text-forest font-semibold shrink-0">
                    AI Extracted
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-text-secondary">
                  <p className="flex items-center gap-2 text-forest font-medium">
                    <Calendar size={13} />
                    <span>{m.meetingDetails?.date || 'Upcoming'} • {m.meetingDetails?.time || 'TBD'}</span>
                  </p>
                  {m.meetingDetails?.participants && (
                    <p className="flex items-center gap-2">
                      <Users size={13} />
                      <span>{m.meetingDetails.participants.join(', ')}</span>
                    </p>
                  )}
                  {m.meetingDetails?.location && (
                    <p className="flex items-center gap-2">
                      <MapPin size={13} />
                      <span>{m.meetingDetails.location}</span>
                    </p>
                  )}
                </div>

                {m.description && (
                  <p className="text-[11px] text-text-secondary pt-2 border-t border-border-main/60 leading-relaxed">
                    {m.description}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal for creating a task */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Task">
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-text-primary mb-1">Task Title</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., Confirm dinner RSVP with client..."
              className="w-full p-2.5 rounded-card bg-bg-primary border border-border-main text-xs outline-none focus:border-forest"
            />
          </div>

          <div>
            <label className="block font-medium text-text-primary mb-1">Details & Description</label>
            <textarea
              rows={3}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Additional context or notes..."
              className="w-full p-2.5 rounded-card bg-bg-primary border border-border-main text-xs outline-none focus:border-forest"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-text-primary mb-1">Due Date</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full p-2.5 rounded-card bg-bg-primary border border-border-main text-xs outline-none focus:border-forest"
              />
            </div>
            <div>
              <label className="block font-medium text-text-primary mb-1">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full p-2.5 rounded-card bg-bg-primary border border-border-main text-xs outline-none focus:border-forest"
              >
                <option value="FOLLOW_UP">Follow-up Task</option>
                <option value="MEETING">Meeting / Call</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-3.5 py-1.5 rounded-card border text-text-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-card bg-forest text-white font-medium hover:bg-forest-hover"
            >
              Create Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
