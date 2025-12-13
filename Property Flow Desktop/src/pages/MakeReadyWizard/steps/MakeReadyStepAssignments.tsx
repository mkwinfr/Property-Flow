// src/pages/MakeReadyWizard/steps/MakeReadyStepAssignments.tsx
import type { MakeReadyTurnDraft } from '../../../types/makeReady';

interface Props {
  turnDraft: MakeReadyTurnDraft;
  onUpdate: (updates: Partial<MakeReadyTurnDraft>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLastStep: boolean;
  isSubmitting: boolean;
}

export default function MakeReadyStepAssignments({
  turnDraft,
  onUpdate,
}: Props) {

  const ACCESS_OPTIONS = [
    { value: 'ON_VENDOR', label: 'On Vendor' },
    { value: 'RESIDENT_KEYS', label: 'Resident Keys' },
  ];

  return (
    <div className="wizard-step-content">
      <div className="wizard-section">
        <h3 className="wizard-section-title">Assignment</h3>

        <div className="wizard-field">
          <label htmlFor="turnOwnerId" className="wizard-label">
            Turn Owner/Project Manager
            <span className="wizard-label-required">*</span>
          </label>
          <input
            id="turnOwnerId"
            type="text"
            placeholder="Name or ID of person managing this turn"
            value={turnDraft.turnOwnerId || ''}
            onChange={(e) => onUpdate({ turnOwnerId: e.target.value })}
          />
        </div>
      </div>

      <div className="wizard-section">
        <h3 className="wizard-section-title">Access Information</h3>

        <div className="wizard-field">
          <label htmlFor="accessMethod" className="wizard-label">
            Access Method
          </label>
          <select
            id="accessMethod"
            value={turnDraft.accessMethod || 'ON_VENDOR'}
            onChange={(e) => onUpdate({ accessMethod: e.target.value as 'ON_VENDOR' | 'RESIDENT_KEYS' })}
          >
            {ACCESS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="wizard-section">
        <div className="wizard-checkbox-group">
          <label
            className={`wizard-pill ${turnDraft.notifyAssignees ? 'wizard-pill--checked' : ''}`}
          >
            <input
              type="checkbox"
              className="wizard-pill__input"
              checked={turnDraft.notifyAssignees || false}
              onChange={(e) => onUpdate({ notifyAssignees: e.target.checked })}
            />
            <span className="wizard-pill__check">✓</span>
            <span className="wizard-pill__text">
              Notify assigned team members when turn is created
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
