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
  onPrevious,
}: Props) {
  const totalMaterialsCost = (turnDraft.materials || []).reduce((sum, m) => {
    return sum + ((m.costPerUnit || 0) * m.quantity);
  }, 0);

  const totalCost =
    (turnDraft.estimatedLaborCost || 0) + totalMaterialsCost;

  return (
    <div className="wizard-step-content review-content">
      <h3>Review Your Turn Details</h3>

      <div className="review-section">
        <h4>Turn Information</h4>
        <div className="review-grid">
          <div className="review-item">
            <label>Property</label>
            <span>{turnDraft.propertyId || 'N/A'}</span>
          </div>
          <div className="review-item">
            <label>Unit</label>
            <span>{turnDraft.unitId || 'N/A'}</span>
          </div>
          <div className="review-item">
            <label>Turn Type</label>
            <span>{turnDraft.turnType?.replace(/_/g, ' ') || 'N/A'}</span>
          </div>
          <div className="review-item">
            <label>Priority</label>
            <span>{turnDraft.priority || 'N/A'}</span>
          </div>
          <div className="review-item">
            <label>Move Out Date</label>
            <span>
              {turnDraft.moveOutDate
                ? new Date(turnDraft.moveOutDate).toLocaleDateString()
                : 'N/A'}
            </span>
          </div>
          <div className="review-item">
            <label>Target Ready Date</label>
            <span>
              {turnDraft.targetReadyDate
                ? new Date(turnDraft.targetReadyDate).toLocaleDateString()
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      <div className="review-section">
        <h4>Work Scope</h4>
        <div className="review-item">
          <label>Categories</label>
          <span>
            {turnDraft.selectedCategories && turnDraft.selectedCategories.length > 0
              ? turnDraft.selectedCategories.join(', ')
              : 'None selected'}
          </span>
        </div>
      </div>

      <div className="review-section">
        <h4>Assignments</h4>
        <div className="review-item">
          <label>Project Manager</label>
          <span>{turnDraft.turnOwnerId || 'N/A'}</span>
        </div>
      </div>

      <div className="review-section">
        <h4>Tasks & Materials</h4>
        <div className="review-item">
          <label>Tasks</label>
          <span>{turnDraft.tasks?.length || 0} tasks</span>
        </div>
        <div className="review-item">
          <label>Materials</label>
          <span>{turnDraft.materials?.length || 0} items</span>
        </div>
      </div>

      <div className="review-section">
        <h4>Cost Summary</h4>
        <div className="review-item">
          <label>Estimated Labor</label>
          <span>${(turnDraft.estimatedLaborCost || 0).toFixed(2)}</span>
        </div>
        <div className="review-item">
          <label>Materials</label>
          <span>${totalMaterialsCost.toFixed(2)}</span>
        </div>
        <div className="review-item cost-total">
          <label>Total Estimated Cost</label>
          <span>${totalCost.toFixed(2)}</span>
        </div>
      </div>

      <div className="review-actions">
        <button className="wizard-btn wizard-btn-secondary" onClick={onPrevious}>
          Back to Edit
        </button>
        <p className="review-info">
          Click "Create Turn" to submit this turn and open it in the Make Ready Board
        </p>
      </div>
    </div>
  );
}
