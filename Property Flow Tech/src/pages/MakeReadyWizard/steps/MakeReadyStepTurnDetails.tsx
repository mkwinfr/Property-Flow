// src/pages/MakeReadyWizard/steps/MakeReadyStepTurnDetails.tsx
import type { MakeReadyTurnDraft, TurnType, PriorityLevel } from '../../../types/makeReady';

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
const BUILDINGS = [
  {
    id: 'bldg-a',
    name: 'Building A',
    units: ['A-101', 'A-102', 'A-201', 'A-202'],
  },
  {
    id: 'bldg-b',
    name: 'Building B',
    units: ['B-101', 'B-102', 'B-201', 'B-202', 'B-301'],
  },
  {
    id: 'bldg-c',
    name: 'Building C',
    units: ['C-01', 'C-02', 'C-03'],
  },
];

export default function MakeReadyStepTurnDetails({
  turnDraft,
  onUpdate,
}: Props) {

  return (
    <div className="wizard-step-content">
      <div className="wizard-section">
        <h3 className="wizard-section-title">Turn Information</h3>
        
        <div className="wizard-field">
          <label htmlFor="propertyId" className="wizard-label">
            Building
            <span className="wizard-label-required">*</span>
          </label>
          <select
            id="propertyId"
            value={turnDraft.propertyId || ''}
            onChange={(e) => onUpdate({ propertyId: e.target.value, unitId: '' })}
          >
            <option value="">Select a building</option>
            {BUILDINGS.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
        </div>

        {turnDraft.propertyId && (
          <div className="wizard-field">
            <label htmlFor="unitId" className="wizard-label">
              Apartment
              <span className="wizard-label-required">*</span>
            </label>
            <select
              id="unitId"
              value={turnDraft.unitId || ''}
              onChange={(e) => onUpdate({ unitId: e.target.value })}
            >
              <option value="">Select an apartment</option>
              {BUILDINGS.find((b) => b.id === turnDraft.propertyId)?.units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="wizard-inline-grid">
          <div className="wizard-field">
            <label htmlFor="turnType" className="wizard-label">
              Turn Type
              <span className="wizard-label-required">*</span>
            </label>
            <select
              id="turnType"
              value={turnDraft.turnType || 'STANDARD_MOVE_OUT'}
              onChange={(e) => onUpdate({ turnType: e.target.value as TurnType })}
            >
              {TURN_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="wizard-field">
            <label htmlFor="priority" className="wizard-label">
              Priority
              <span className="wizard-label-required">*</span>
            </label>
            <select
              id="priority"
              value={turnDraft.priority || 'NORMAL'}
              onChange={(e) => onUpdate({ priority: e.target.value as PriorityLevel })}
            >
              {PRIORITY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="wizard-section">
        <h3 className="wizard-section-title">Key Dates</h3>
        
        <div className="wizard-inline-grid">
          <div className="wizard-field">
            <label htmlFor="moveOutDate" className="wizard-label">
              Move-Out Date
            </label>
            <input
              id="moveOutDate"
              type="date"
              value={turnDraft.moveOutDate ? turnDraft.moveOutDate.split('T')[0] : ''}
              onChange={(e) =>
                onUpdate({
                  moveOutDate: new Date(e.target.value).toISOString(),
                })
              }
            />
          </div>

          <div className="wizard-field">
            <label htmlFor="targetReadyDate" className="wizard-label">
              Target Ready Date
              <span className="wizard-label-required">*</span>
            </label>
            <input
              id="targetReadyDate"
              type="date"
              value={turnDraft.targetReadyDate ? turnDraft.targetReadyDate.split('T')[0] : ''}
              onChange={(e) =>
                onUpdate({
                  targetReadyDate: new Date(e.target.value).toISOString(),
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="wizard-section">
        <div className="wizard-field">
          <label htmlFor="turnNotes" className="wizard-label">
            Notes
          </label>
          <textarea
            id="turnNotes"
            placeholder="Add any additional notes about this turn"
            value={turnDraft.turnNotes || ''}
            onChange={(e) => onUpdate({ turnNotes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
