// src/pages/MoveoutInspectionWizard/steps/MoveoutInspectionStepGenerateWork.tsx
import React, { useState, useEffect } from 'react';
import { apiUrl } from '@/config/api';

interface Props {
  wizardState: any;
  onNext: () => void;
  onPrevious: () => void;
  onSaveDraft: () => Promise<void>;
  isSubmitting: boolean;
}

const MoveoutInspectionStepGenerateWork: React.FC<Props> = ({
  wizardState,
  onNext,
  onPrevious,
  onSaveDraft,
  isSubmitting,
}) => {
  const [taskPreview, setTaskPreview] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadPreview = async () => {
      if (!wizardState.inspectionId) return;

      setIsLoading(true);
      try {
        const response = await fetch(
          apiUrl(`/api/moveout-inspections/${wizardState.inspectionId}/generate-work`),
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }
        );

        if (response.ok) {
          const data = await response.json();
          setTaskPreview(data.tasksToCreate || []);
        }
      } catch (err) {
        console.error('Failed to load work preview', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();
  }, [wizardState.inspectionId]);

  const handleNext = async () => {
    await onSaveDraft();
    onNext();
  };

  return (
    <div className="wizard-step-generate-work">
      <h2>Preview Work to Generate</h2>

      {isLoading ? (
        <div className="loading-state">
          <p>Loading task preview...</p>
        </div>
      ) : taskPreview.length === 0 ? (
        <div className="empty-state">
          <p>No work items to generate. All items are either OK or not inspected.</p>
        </div>
      ) : (
        <div className="work-preview">
          <p className="preview-subtitle">The following tasks will be created based on your findings:</p>

          <div className="tasks-list">
            {taskPreview.map((task, idx) => (
              <div key={idx} className="task-preview-card">
                <div className="task-header">
                  <h4 className="task-title">
                    {task.roomKey} - {task.itemLabel}
                  </h4>
                  <span className={`task-condition task-condition--${task.condition.toLowerCase()}`}>
                    {task.condition}
                  </span>
                </div>
                <p className="task-category">{task.category}</p>
                {task.notes && <p className="task-notes">{task.notes}</p>}
                {task.estimated && <p className="task-estimate">Est. Cost: ${task.estimated.toFixed(2)}</p>}
              </div>
            ))}
          </div>

          <div className="work-summary">
            <p>
              <strong>{taskPreview.length}</strong> work tasks will be created and assigned for completion.
            </p>
          </div>
        </div>
      )}

      <div className="wizard-actions">
        <button
          className="btn btn-secondary"
          onClick={onPrevious}
          disabled={isSubmitting}
          type="button"
        >
          ← Back
        </button>
        <button
          className="btn btn-primary"
          onClick={handleNext}
          disabled={isSubmitting || isLoading}
          type="button"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default MoveoutInspectionStepGenerateWork;
