// src/pages/MakeReadyWizard/steps/MakeReadyStepTasks.tsx
import { useState } from 'react';
import type { MakeReadyTurnDraft, MakeReadyTask, TaskPriority, WorkCategory } from '@/types/makeReady';

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
  onNext,
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
      <div className="tasks-list">
        {turnDraft.tasks && turnDraft.tasks.length > 0 ? (
          <div className="tasks-items">
            {turnDraft.tasks.map((task) => (
              <div key={task.id} className="task-item">
                <div className="task-header">
                  <h4>{task.title}</h4>
                  <span className="task-priority" data-priority={task.priority}>
                    {task.priority}
                  </span>
                </div>
                <p className="task-meta">
                  {task.category} • {task.area}
                </p>
                {task.internalNotes && <p className="task-notes">{task.internalNotes}</p>}
                <div className="task-actions">
                  <button
                    className="task-btn task-btn-edit"
                    onClick={() => {
                      setFormData(task);
                      setEditingId(task.id);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="task-btn task-btn-delete"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No tasks added yet</p>
        )}
      </div>

      {showForm && (
        <div className="task-form">
          <h3>{editingId ? 'Edit Task' : 'Add Task'}</h3>
          <div className="form-group">
            <label htmlFor="taskTitle">Title *</label>
            <input
              id="taskTitle"
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-input"
              placeholder="Task title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="taskCategory">Category *</label>
            <select
              id="taskCategory"
              value={formData.category || ''}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value as WorkCategory })
              }
              className="form-select"
            >
              <option value="">Select category</option>
              {Array.from(new Set(turnDraft.selectedCategories)).map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="taskArea">Area</label>
            <select
              id="taskArea"
              value={formData.area || 'WHOLE_UNIT'}
              onChange={(e) => setFormData({ ...formData, area: e.target.value as any })}
              className="form-select"
            >
              {AREAS.map((area) => (
                <option key={area} value={area}>
                  {area.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="taskPriority">Priority</label>
            <select
              id="taskPriority"
              value={formData.priority || 'NORMAL'}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value as TaskPriority })
              }
              className="form-select"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="taskNotes">Notes</label>
            <textarea
              id="taskNotes"
              value={formData.internalNotes || ''}
              onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
              className="form-textarea"
              placeholder="Internal notes for this task"
            />
          </div>

          <div className="form-actions">
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
        <button
          className="wizard-btn wizard-btn-secondary wizard-btn-block"
          onClick={() => setShowForm(true)}
        >
          + Add Task
        </button>
      )}

      <button
        className="wizard-btn wizard-btn-primary"
        onClick={onNext}
        disabled={!turnDraft.tasks || turnDraft.tasks.length === 0}
      >
        Continue
      </button>
    </div>
  );
}
