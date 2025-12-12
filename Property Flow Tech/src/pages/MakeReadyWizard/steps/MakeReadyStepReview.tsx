// src/pages/MakeReadyWizard/steps/MakeReadyStepReview.tsx
import type { MakeReadyTurnDraft } from '@/types/makeReady';

interface Props {
  turnDraft: MakeReadyTurnDraft;
  onUpdate: (updates: Partial<MakeReadyTurnDraft>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLastStep: boolean;
  isSubmitting: boolean;
}

export default function MakeReadyStepReview({
  turnDraft,
}: Props) {
  const totalMaterialsCost = (turnDraft.materials || []).reduce((sum, m) => {
    return sum + ((m.costPerUnit || 0) * m.quantity);
  }, 0);

  const totalCost =
    (turnDraft.estimatedLaborCost || 0) + totalMaterialsCost;

  return (
    <div className="wizard-step-content">
      <div className="wizard-section">
        <h3 className="wizard-section-title">Turn Information</h3>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className="wizard-review-item">
            <span className="wizard-review-label">Property</span>
            <span className="wizard-review-value">{turnDraft.propertyId || '—'}</span>
          </div>
          <div className="wizard-review-item">
            <span className="wizard-review-label">Unit</span>
            <span className="wizard-review-value">{turnDraft.unitId || '—'}</span>
          </div>
          <div className="wizard-review-item">
            <span className="wizard-review-label">Turn Type</span>
            <span className="wizard-review-value">{turnDraft.turnType?.replace(/_/g, ' ') || '—'}</span>
          </div>
          <div className="wizard-review-item">
            <span className="wizard-review-label">Priority</span>
            <span className="wizard-review-value">{turnDraft.priority || '—'}</span>
          </div>
          <div className="wizard-review-item">
            <span className="wizard-review-label">Move Out Date</span>
            <span className="wizard-review-value">
              {turnDraft.moveOutDate
                ? new Date(turnDraft.moveOutDate).toLocaleDateString()
                : '—'}
            </span>
          </div>
          <div className="wizard-review-item">
            <span className="wizard-review-label">Target Ready Date</span>
            <span className="wizard-review-value">
              {turnDraft.targetReadyDate
                ? new Date(turnDraft.targetReadyDate).toLocaleDateString()
                : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="wizard-section">
        <h3 className="wizard-section-title">Work Scope</h3>
        <div className="wizard-review-item">
          <span className="wizard-review-label">Categories</span>
          <span className="wizard-review-value">
            {turnDraft.selectedCategories && turnDraft.selectedCategories.length > 0
              ? turnDraft.selectedCategories.map(c => c.replace(/_/g, ' ')).join(', ')
              : '—'}
          </span>
        </div>
      </div>

      <div className="wizard-section">
        <h3 className="wizard-section-title">Assignments</h3>
        <div className="wizard-review-item">
          <span className="wizard-review-label">Project Manager</span>
          <span className="wizard-review-value">{turnDraft.turnOwnerId || '—'}</span>
        </div>
      </div>

      <div className="wizard-section">
        <h3 className="wizard-section-title">Tasks & Materials</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div className="wizard-review-item">
            <span className="wizard-review-label">Tasks</span>
            <span className="wizard-review-value">{turnDraft.tasks?.length || 0} tasks</span>
          </div>
          <div className="wizard-review-item">
            <span className="wizard-review-label">Materials</span>
            <span className="wizard-review-value">{turnDraft.materials?.length || 0} items</span>
          </div>
        </div>
      </div>

      <div className="wizard-section">
        <h3 className="wizard-section-title">Cost Summary</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div className="wizard-review-item">
            <span className="wizard-review-label">Estimated Labor</span>
            <span className="wizard-review-value">${(turnDraft.estimatedLaborCost || 0).toFixed(2)}</span>
          </div>
          <div className="wizard-review-item">
            <span className="wizard-review-label">Materials</span>
            <span className="wizard-review-value">${totalMaterialsCost.toFixed(2)}</span>
          </div>
          <div className="wizard-review-item" style={{
            padding: '0.75rem',
            background: 'rgba(91, 157, 217, 0.1)',
            borderRadius: '6px',
            marginTop: '0.5rem'
          }}>
            <span className="wizard-review-label">Total Estimated Cost</span>
            <span style={{ color: '#5b9dd9', fontWeight: '700', fontSize: '16px' }}>
              ${totalCost.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div style={{ 
        padding: '1rem',
        background: '#232f40',
        borderRadius: '8px',
        border: '1px solid rgba(91, 157, 217, 0.1)',
        color: '#9ca3af',
        fontSize: '13px',
        lineHeight: '1.5'
      }}>
        Review the information above. Click "Create Turn" to submit this turn and open it in the Make Ready Board.
      </div>
    </div>
  );
}
