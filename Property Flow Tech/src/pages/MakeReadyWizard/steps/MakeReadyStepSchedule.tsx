// src/pages/MakeReadyWizard/steps/MakeReadyStepSchedule.tsx
import type { MakeReadyTurnDraft } from '@/types/makeReady';

interface Props {
  turnDraft: MakeReadyTurnDraft;
  onUpdate: (updates: Partial<MakeReadyTurnDraft>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLastStep: boolean;
  isSubmitting: boolean;
}

export default function MakeReadyStepSchedule({
  turnDraft,
  onUpdate,
  onNext,
}: Props) {
  return (
    <div className="wizard-step-content">
      <p>Review and set the timeline for this turn:</p>

      <div className="info-box">
        <div className="info-item">
          <strong>Move Out Date:</strong>
          <span>
            {turnDraft.moveOutDate
              ? new Date(turnDraft.moveOutDate).toLocaleDateString()
              : 'Not set'}
          </span>
        </div>
        <div className="info-item">
          <strong>Target Ready Date:</strong>
          <span>
            {turnDraft.targetReadyDate
              ? new Date(turnDraft.targetReadyDate).toLocaleDateString()
              : 'Not set'}
          </span>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="estimatedLaborCost">Estimated Labor Cost ($)</label>
        <input
          id="estimatedLaborCost"
          type="number"
          min="0"
          step="0.01"
          value={turnDraft.estimatedLaborCost || 0}
          onChange={(e) =>
            onUpdate({ estimatedLaborCost: parseFloat(e.target.value) || 0 })
          }
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="estimatedMaterialsCost">Estimated Materials Cost ($)</label>
        <input
          id="estimatedMaterialsCost"
          type="number"
          min="0"
          step="0.01"
          value={turnDraft.estimatedMaterialsCost || 0}
          onChange={(e) =>
            onUpdate({ estimatedMaterialsCost: parseFloat(e.target.value) || 0 })
          }
          className="form-input"
        />
      </div>

      {(turnDraft.estimatedLaborCost || turnDraft.estimatedMaterialsCost) && (
        <div className="info-box">
          <strong>Total Estimated Cost:</strong>
          <span className="cost-total">
            $
            {(
              (turnDraft.estimatedLaborCost || 0) +
              (turnDraft.estimatedMaterialsCost || 0)
            ).toFixed(2)}
          </span>
        </div>
      )}

      <button className="wizard-btn wizard-btn-primary" onClick={onNext}>
        Continue
      </button>
    </div>
  );
}
