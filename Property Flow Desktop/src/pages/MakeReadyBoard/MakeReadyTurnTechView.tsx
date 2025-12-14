// src/pages/MakeReadyBoard/MakeReadyTurnTechView.tsx
import { useState, useEffect } from 'react';
import { apiUrl } from '../../config/api';
import type { TaskStatus } from '../../types/makeReady';
import './MakeReadyTurnTechView.css';

interface Props {
  turnId: string | null;
  onClose: () => void;
}

export default function MakeReadyTurnTechView({ turnId, onClose }: Props) {
  const [turn, setTurn] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!turnId) return;

    const fetchTurn = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(apiUrl(`/api/make-ready-turns/${turnId}`));
        if (!response.ok) throw new Error('Failed to fetch turn');
        const data = await response.json();
        setTurn(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load turn');
      } finally {
        setLoading(false);
      }
    };

    fetchTurn();
  }, [turnId]);

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!turnId) return;

    setUpdatingTaskId(taskId);
    try {
      const response = await fetch(
        apiUrl(`/api/make-ready-turns/${turnId}/tasks/${taskId}`),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) throw new Error('Failed to update task');

      // Update local state
      setTurn((prev: any) => ({
        ...prev,
        tasks: prev.tasks.map((t: any) =>
          t.id === taskId ? { ...t, status: newStatus } : t
        ),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  if (!turnId) {
    return (
      <div className="tech-view-empty">
        <p>Select a turn to view details</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="tech-view-container">
        <div className="tech-view-loading">Loading turn details...</div>
      </div>
    );
  }

  if (error || !turn) {
    return (
      <div className="tech-view-container">
        <div className="tech-view-error">
          <p>{error || 'Turn not found'}</p>
          <button onClick={onClose} className="tech-view-close-btn">
            Close
          </button>
        </div>
      </div>
    );
  }

  const completedCount = turn.tasks?.filter((t: any) => t.status === 'DONE').length || 0;
  const totalCount = turn.tasks?.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="tech-view-container">
      <div className="tech-view-header">
        <div className="tech-view-title-group">
          <h2 className="tech-view-title">
            {turn.apartment?.unitNumber || 'Unknown Unit'}
          </h2>
          <span className={`tech-view-status status-${turn.status?.toLowerCase()}`}>
            {turn.status}
          </span>
        </div>
        <button onClick={onClose} className="tech-view-close-btn" aria-label="Close">
          ✕
        </button>
      </div>

      <div className="tech-view-info">
        <div className="info-item">
          <label>Building</label>
          <span>{turn.apartment?.building || 'N/A'}</span>
        </div>
        <div className="info-item">
          <label>Project Manager</label>
          <span>{turn.turnOwnerId || 'Unassigned'}</span>
        </div>
        <div className="info-item">
          <label>Priority</label>
          <span className={`priority-badge priority-${turn.priority?.toLowerCase()}`}>
            {turn.priority || 'Normal'}
          </span>
        </div>
        <div className="info-item">
          <label>Target Ready</label>
          <span>
            {turn.targetReadyDate
              ? new Date(turn.targetReadyDate).toLocaleDateString()
              : 'N/A'}
          </span>
        </div>
      </div>

      <div className="tech-view-progress">
        <div className="progress-label">
          <span className="progress-text">
            Task Progress: {completedCount} of {totalCount} complete
          </span>
          <span className="progress-percent">{Math.round(progress)}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {turn.turnNotes && (
        <div className="tech-view-notes">
          <h3>Notes</h3>
          <p>{turn.turnNotes}</p>
        </div>
      )}

      <div className="tech-view-tasks">
        <h3>Tasks</h3>
        {turn.tasks && turn.tasks.length > 0 ? (
          <div className="tasks-grid">
            {turn.tasks.map((task: any) => (
              <div
                key={task.id}
                className={`task-card task-status-${task.status?.toLowerCase()}`}
              >
                <div className="task-card-header">
                  <h4 className="task-card-title">{task.title}</h4>
                  <div className="task-actions">
                    {task.status !== 'DONE' && (
                      <button
                        onClick={() => handleTaskStatusChange(task.id, 'DONE')}
                        disabled={updatingTaskId === task.id}
                        className="task-btn task-btn-complete"
                        title="Mark complete"
                      >
                        ✓
                      </button>
                    )}
                    {task.status === 'DONE' && (
                      <span className="task-done-check">✓ Done</span>
                    )}
                  </div>
                </div>

                <div className="task-card-meta">
                  <span className="meta-badge">{task.category}</span>
                  <span className="meta-badge">{task.area}</span>
                  <span className={`meta-badge priority-${task.priority?.toLowerCase()}`}>
                    {task.priority}
                  </span>
                </div>

                {task.internalNotes && (
                  <p className="task-card-notes">{task.internalNotes}</p>
                )}

                {task.dueDate && (
                  <p className="task-card-due">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="no-tasks">No tasks added yet</p>
        )}
      </div>

      {turn.materials && turn.materials.length > 0 && (
        <div className="tech-view-materials">
          <h3>Materials</h3>
          <div className="materials-list">
            {turn.materials.map((mat: any) => (
              <div key={mat.id} className="material-line">
                <span className="material-item">{mat.item}</span>
                <span className="material-qty">
                  {mat.quantity} {mat.unit}
                </span>
                {mat.costPerUnit && (
                  <span className="material-cost">
                    ${(mat.costPerUnit * mat.quantity).toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
