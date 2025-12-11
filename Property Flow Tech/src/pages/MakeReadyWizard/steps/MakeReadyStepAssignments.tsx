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
  onNext,
}: Props) {
  const canContinue = turnDraft.turnOwnerId;

  return (
    <div className="wizard-step-content">
      <div className="form-group">
        <label htmlFor="turnOwnerId">Turn Owner/Project Manager *</label>
        <input
          id="turnOwnerId"
          type="text"
          placeholder="Name or ID of person managing this turn"
          value={turnDraft.turnOwnerId || ''}
          onChange={(e) => onUpdate({ turnOwnerId: e.target.value })}
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="accessInstructions">Access Instructions</label>
        <textarea
          id="accessInstructions"
          placeholder="How to access the unit (e.g., key location, alarm codes)"
          value={turnDraft.accessInstructions || ''}
          onChange={(e) => onUpdate({ accessInstructions: e.target.value })}
          className="form-textarea"
        />
      </div>

      <div className="form-group">
        <label htmlFor="alarmCodes">Alarm Codes & Notes</label>
        <textarea
          id="alarmCodes"
          placeholder="Any alarm codes, security codes, or other access information"
          value={turnDraft.alarmCodes || ''}
          onChange={(e) => onUpdate({ alarmCodes: e.target.value })}
          className="form-textarea"
        />
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={turnDraft.notifyAssignees || false}
            onChange={(e) => onUpdate({ notifyAssignees: e.target.checked })}
          />
          Notify assigned team members when turn is created
        </label>
      </div>

      <button
        className="wizard-btn wizard-btn-primary"
        onClick={onNext}
        disabled={!canContinue}
      >
        Continue
      </button>
    </div>
  );
}
