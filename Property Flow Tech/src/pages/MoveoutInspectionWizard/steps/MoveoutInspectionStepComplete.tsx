// src/pages/MoveoutInspectionWizard/steps/MoveoutInspectionStepComplete.tsx
import React, { useEffect, useState } from 'react';
import { apiUrl } from '@/config/api';

interface Props {
  wizardState: any;
  isSubmitting: boolean;
}

const MoveoutInspectionStepComplete: React.FC<Props> = ({ wizardState, isSubmitting }) => {
  const [isLocking, setIsLocking] = useState(false);
  const [locked, setLocked] = useState(false);

  const handleLockInspection = async () => {
    if (!wizardState.inspectionId || isLocking) return;

    setIsLocking(true);
    try {
      const response = await fetch(
        apiUrl(`/api/moveout-inspections/${wizardState.inspectionId}/lock`),
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }
      );

      if (response.ok) {
        setLocked(true);
      }
    } catch (err) {
      console.error('Failed to lock inspection', err);
    } finally {
      setIsLocking(false);
    }
  };

  const handleBackToDash = () => {
    window.dispatchEvent(new CustomEvent('navigate-to-board'));
  };

  return (
    <div className="wizard-step-complete">
      <div className="completion-card">
        <div className="completion-icon">✓</div>
        <h2 className="completion-title">Inspection Complete</h2>
        <p className="completion-subtitle">Your moveout inspection has been successfully recorded.</p>

        <div className="completion-details">
          <div className="detail-row">
            <span className="detail-label">Inspection ID:</span>
            <span className="detail-value">#{wizardState.inspectionId}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Items Documented:</span>
            <span className="detail-value">{wizardState.items?.length || 0}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Charges Proposed:</span>
            <span className="detail-value">{wizardState.charges?.length || 0}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Status:</span>
            <span className={`detail-value status-${locked ? 'locked' : 'completed'}`}>
              {locked ? 'LOCKED (Read-Only)' : 'COMPLETED'}
            </span>
          </div>
        </div>

        {!locked && (
          <div className="completion-actions">
            <p className="action-subtitle">Lock this inspection to prevent further edits:</p>
            <button
              className="btn btn-secondary"
              onClick={handleLockInspection}
              disabled={isLocking || isSubmitting}
              type="button"
            >
              {isLocking ? 'Locking...' : '🔒 Lock Inspection'}
            </button>
          </div>
        )}

        <div className="wizard-actions">
          <button
            className="btn btn-primary"
            onClick={handleBackToDash}
            disabled={isSubmitting}
            type="button"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveoutInspectionStepComplete;
