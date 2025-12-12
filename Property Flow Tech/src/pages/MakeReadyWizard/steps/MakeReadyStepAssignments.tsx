// src/pages/MakeReadyWizard/steps/MakeReadyStepAssignments.tsx
import type { MakeReadyTurnDraft } from '@/types/makeReady';

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
          <label htmlFor="accessInstructions" className="wizard-label">
            Access Instructions
          </label>
          <textarea
            id="accessInstructions"
            placeholder="How to access the unit (e.g., key location, alarm codes)"
            value={turnDraft.accessInstructions || ''}
            onChange={(e) => onUpdate({ accessInstructions: e.target.value })}
          />
        </div>

        <div className="wizard-field">
          <label htmlFor="alarmCodes" className="wizard-label">
            Alarm Codes & Notes
          </label>
          <textarea
            id="alarmCodes"
            placeholder="Any alarm codes, security codes, or other access information"
            value={turnDraft.alarmCodes || ''}
            onChange={(e) => onUpdate({ alarmCodes: e.target.value })}
          />
        </div>
      </div>

      <div className="wizard-section">
        <div className="wizard-checkbox-group">
          <div className="wizard-checkbox-item">
            <input
              type="checkbox"
              id="notifyAssignees"
              checked={turnDraft.notifyAssignees || false}
              onChange={(e) => onUpdate({ notifyAssignees: e.target.checked })}
            />
            <label htmlFor="notifyAssignees">
              Notify assigned team members when turn is created
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
