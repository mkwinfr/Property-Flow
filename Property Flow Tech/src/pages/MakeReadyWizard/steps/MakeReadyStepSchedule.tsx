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
}: Props) {
  return (
    <div className="wizard-step-content">
      <div className="wizard-section">
        <h3 className="wizard-section-title">Timeline Review</h3>
        
        <div style={{
          padding: '1rem',
          background: '#232f40',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: '1px solid rgba(91, 157, 217, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '600' }}>Move Out Date</span>
            <span style={{ color: '#f5f5f5' }}>
              {turnDraft.moveOutDate
                ? new Date(turnDraft.moveOutDate).toLocaleDateString()
                : 'Not set'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '600' }}>Target Ready Date</span>
            <span style={{ color: '#f5f5f5' }}>
              {turnDraft.targetReadyDate
                ? new Date(turnDraft.targetReadyDate).toLocaleDateString()
                : 'Not set'}
            </span>
          </div>
        </div>
      </div>

      <div className="wizard-section">
        <h3 className="wizard-section-title">Estimated Costs</h3>

        <div className="wizard-inline-grid">
          <div className="wizard-field">
            <label htmlFor="estimatedLaborCost" className="wizard-label">
              Labor Cost ($)
            </label>
            <input
              id="estimatedLaborCost"
              type="number"
              min="0"
              step="0.01"
              value={turnDraft.estimatedLaborCost || 0}
              onChange={(e) =>
                onUpdate({ estimatedLaborCost: parseFloat(e.target.value) || 0 })
              }
            />
          </div>

          <div className="wizard-field">
            <label htmlFor="estimatedMaterialsCost" className="wizard-label">
              Materials Cost ($)
            </label>
            <input
              id="estimatedMaterialsCost"
              type="number"
              min="0"
              step="0.01"
              value={turnDraft.estimatedMaterialsCost || 0}
              onChange={(e) =>
                onUpdate({ estimatedMaterialsCost: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </div>

        {(turnDraft.estimatedLaborCost || turnDraft.estimatedMaterialsCost) && (
          <div style={{
            padding: '1rem',
            background: 'rgba(91, 157, 217, 0.05)',
            borderRadius: '8px',
            border: '1px solid rgba(91, 157, 217, 0.2)',
            marginTop: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '600' }}>
                Total Estimated Cost
              </span>
              <span style={{ color: '#5b9dd9', fontSize: '18px', fontWeight: '700' }}>
                $
                {(
                  (turnDraft.estimatedLaborCost || 0) +
                  (turnDraft.estimatedMaterialsCost || 0)
                ).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
