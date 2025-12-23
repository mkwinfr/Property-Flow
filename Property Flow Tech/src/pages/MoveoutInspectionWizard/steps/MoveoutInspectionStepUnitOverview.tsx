// src/pages/MoveoutInspectionWizard/steps/MoveoutInspectionStepUnitOverview.tsx
import React, { useState } from 'react';
import type { MoveoutInspectionDraft } from '@/types/moveoutInspection';

interface Props {
  wizardState: any;
  onDraftUpdate: (updates: Partial<MoveoutInspectionDraft>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isSubmitting: boolean;
}

const MoveoutInspectionStepUnitOverview: React.FC<Props> = ({
  wizardState,
  onDraftUpdate,
  onNext,
  onPrevious,
  isSubmitting,
}) => {
  const [checklist, setChecklist] = useState({
    keysReturned: false,
    utilitiesOff: false,
    detectorsCheck: false,
  });

  const handleChecklistChange = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="wizard-step-unit-overview">
      <div className="form">
        <h2 className="form-heading">Unit Walkthrough Checklist</h2>

        <div className="form-group">
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={checklist.keysReturned}
              onChange={() => handleChecklistChange('keysReturned')}
              disabled={isSubmitting}
            />
            <span>Keys returned by tenant</span>
          </label>
        </div>

        <div className="form-group">
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={checklist.utilitiesOff}
              onChange={() => handleChecklistChange('utilitiesOff')}
              disabled={isSubmitting}
            />
            <span>Utilities confirmed off/transferred</span>
          </label>
        </div>

        <div className="form-group">
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={checklist.detectorsCheck}
              onChange={() => handleChecklistChange('detectorsCheck')}
              disabled={isSubmitting}
            />
            <span>Smoke & CO detectors checked</span>
          </label>
        </div>

        <div className="form-group">
          <label className="form-label">General Unit Observations</label>
          <textarea
            className="form-input form-textarea"
            placeholder="Document overall unit condition, odors, pest activity, etc..."
            value={wizardState.inspectionDraft.notes || ''}
            onChange={(e) => onDraftUpdate({ notes: e.target.value })}
            disabled={isSubmitting}
            rows={6}
          />
        </div>

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
            onClick={onNext}
            disabled={isSubmitting}
            type="button"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveoutInspectionStepUnitOverview;
