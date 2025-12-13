// src/pages/MakeReadyWizard/steps/MakeReadyStepTasks.tsx
import { useState } from 'react';
import type { MakeReadyTurnDraft, MakeReadyTask, TaskPriority, WorkCategory } from '../../../types/makeReady';

interface Props {
  turnDraft: MakeReadyTurnDraft;
  onUpdate: (updates: Partial<MakeReadyTurnDraft>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLastStep: boolean;
  isSubmitting: boolean;
}

const AREAS = [
  'WHOLE_UNIT',
  'LIVING_ROOM',
  'KITCHEN',
  'BEDROOM_1',
  'BEDROOM_2',
  'BEDROOM_3',
  'BATHROOM_1',
  'BATHROOM_2',
  'HALLWAY',
  'OTHER',
];
const PRIORITIES: TaskPriority[] = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'];

export default function MakeReadyStepTasks({
  turnDraft,
  onUpdate,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<MakeReadyTask>>({});

  const handleAddTask = () => {
    if (!formData.title || !formData.category) return;

    const task: MakeReadyTask = {
      id: editingId || `task-${Date.now()}`,
      title: formData.title,
      category: formData.category as WorkCategory,
      area: (formData.area as any) || 'WHOLE_UNIT',
      priority: (formData.priority as TaskPriority) || 'NORMAL',
      internalNotes: formData.internalNotes,
      budgetedCost: formData.budgetedCost,
    };

    const tasks = turnDraft.tasks || [];
    const updated = editingId
      ? tasks.map((t) => (t.id === editingId ? task : t))
      : [...tasks, task];

    onUpdate({ tasks: updated });
    setFormData({});
    setShowForm(false);
    setEditingId(null);
  };

  const handleDeleteTask = (id: string) => {
    onUpdate({
      tasks: (turnDraft.tasks || []).filter((t) => t.id !== id),
    });
  };

  return (
    <div className="wizard-step-content">
      <div className="wizard-section">
        <h3 className="wizard-section-title">Tasks List</h3>
        <div className="tasks-list">
          {turnDraft.tasks && turnDraft.tasks.length > 0 ? (
            <div className="tasks-items">
              {turnDraft.tasks.map((task) => (
                <div key={task.id} className="wizard-task-card">
                  <div className="wizard-task-info">
                    <div className="wizard-task-name">{task.title}</div>
                    <div className="wizard-task-desc">
                      {task.category?.replace(/_/g, ' ')} • {task.area?.replace(/_/g, ' ')} • {task.priority}
                    </div>
                    {task.internalNotes && (
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                        {task.internalNotes}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="wizard-task-action"
                      style={{ background: '#5b9dd9' }}
                      onClick={() => {
                        setFormData(task);
                        setEditingId(task.id);
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="wizard-task-action"
                      style={{ background: '#ef4444' }}
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="wizard-empty-copy">No tasks added yet</p>
          )}
        </div>
      </div>

      {showForm && (
        <div className="wizard-section" style={{ background: '#232f40', padding: '1.5rem', borderRadius: '8px' }}>
          <h3 className="wizard-section-title">
            {editingId ? 'Edit Task' : 'Add Task'}
          </h3>

          <div className="wizard-field">
            <label htmlFor="taskTitle" className="wizard-label">
              Title
              <span className="wizard-label-required">*</span>
            </label>
            <input
              id="taskTitle"
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Task title"
            />
          </div>

          <div className="wizard-inline-grid">
            <div className="wizard-field">
              <label htmlFor="taskCategory" className="wizard-label">
                Category
                <span className="wizard-label-required">*</span>
              </label>
              <select
                id="taskCategory"
                value={formData.category || ''}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as WorkCategory })
                }
              >
                <option value="">Select category</option>
                {Array.from(new Set(turnDraft.selectedCategories)).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="wizard-field">
              <label htmlFor="taskArea" className="wizard-label">
                Area
              </label>
              <select
                id="taskArea"
                value={formData.area || 'WHOLE_UNIT'}
                onChange={(e) => setFormData({ ...formData, area: e.target.value as any })}
              >
                {AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="wizard-field">
            <label htmlFor="taskPriority" className="wizard-label">
              Priority
            </label>
            <select
              id="taskPriority"
              value={formData.priority || 'NORMAL'}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value as TaskPriority })
              }
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="wizard-field">
            <label htmlFor="taskNotes" className="wizard-label">
              Notes
            </label>
            <textarea
              id="taskNotes"
              value={formData.internalNotes || ''}
              onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
              placeholder="Internal notes for this task"
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="wizard-btn wizard-btn-primary" onClick={handleAddTask}>
              {editingId ? 'Update Task' : 'Add Task'}
            </button>
            <button
              className="wizard-btn wizard-btn-secondary"
              onClick={() => {
                setShowForm(false);
                setFormData({});
                setEditingId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <div className="wizard-section">
          <button
            className="wizard-btn wizard-btn-secondary"
            style={{ width: '100%' }}
            onClick={() => setShowForm(true)}
          >
            + Add Task
          </button>
        </div>
      )}
    </div>
  );
}
