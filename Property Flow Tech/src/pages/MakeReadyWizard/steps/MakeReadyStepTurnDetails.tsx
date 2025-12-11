// src/pages/MakeReadyWizard/steps/MakeReadyStepTurnDetails.tsx
import type { MakeReadyTurnDraft, TurnType, PriorityLevel } from '@/types/makeReady';

interface Props {
  turnDraft: MakeReadyTurnDraft;
  onUpdate: (updates: Partial<MakeReadyTurnDraft>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLastStep: boolean;
  isSubmitting: boolean;
}

const TURN_TYPES: TurnType[] = ['STANDARD_MOVE_OUT', 'TRANSFER', 'RENOVATION', 'SPECIAL'];
const PRIORITY_LEVELS: PriorityLevel[] = ['LOW', 'NORMAL', 'HIGH', 'DOWN_UNIT'];

export default function MakeReadyStepTurnDetails({
  turnDraft,
  onUpdate,
  onNext,
}: Props) {
  const canContinue = turnDraft.unitId && turnDraft.targetReadyDate;

  return (
    <div className="wizard-step-content">
      <div className="form-group">
        <label htmlFor="propertyId">Property ID *</label>
        <input
          id="propertyId"
          type="text"
          placeholder="Enter property ID"
          value={turnDraft.propertyId || ''}
          onChange={(e) => onUpdate({ propertyId: e.target.value })}
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="unitId">Unit ID *</label>
        <input
          id="unitId"
          type="text"
          placeholder="Enter unit ID or select from list"
          value={turnDraft.unitId || ''}
          onChange={(e) => onUpdate({ unitId: e.target.value })}
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="turnType">Turn Type *</label>
        <select
          id="turnType"
          value={turnDraft.turnType || 'STANDARD_MOVE_OUT'}
          onChange={(e) => onUpdate({ turnType: e.target.value as TurnType })}
          className="form-select"
        >
          {TURN_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="priority">Priority *</label>
        <select
          id="priority"
          value={turnDraft.priority || 'NORMAL'}
          onChange={(e) => onUpdate({ priority: e.target.value as PriorityLevel })}
          className="form-select"
        >
          {PRIORITY_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="moveOutDate">Move-Out Date</label>
        <input
          id="moveOutDate"
          type="date"
          value={turnDraft.moveOutDate ? turnDraft.moveOutDate.split('T')[0] : ''}
          onChange={(e) =>
            onUpdate({
              moveOutDate: new Date(e.target.value).toISOString(),
            })
          }
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="targetReadyDate">Target Ready Date *</label>
        <input
          id="targetReadyDate"
          type="date"
          value={turnDraft.targetReadyDate ? turnDraft.targetReadyDate.split('T')[0] : ''}
          onChange={(e) =>
            onUpdate({
              targetReadyDate: new Date(e.target.value).toISOString(),
            })
          }
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="turnNotes">Notes</label>
        <textarea
          id="turnNotes"
          placeholder="Add any additional notes about this turn"
          value={turnDraft.turnNotes || ''}
          onChange={(e) => onUpdate({ turnNotes: e.target.value })}
          className="form-textarea"
        />
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
