// src/pages/MoveoutInspectionWizard/steps/MoveoutInspectionStepFindingsReview.tsx
import React, { useMemo } from 'react';
import type { MoveoutInspectionItemState, MoveoutInspectionWizardState } from '@/types/moveoutInspection';

interface Props {
  wizardState: MoveoutInspectionWizardState;
  onItemsUpdate: (items: MoveoutInspectionItemState[]) => void;
  onNext: () => void;
  onPrevious: () => void;
  isSubmitting: boolean;
}

const MoveoutInspectionStepFindingsReview: React.FC<Props> = ({
  wizardState,
  onItemsUpdate,
  onNext,
  onPrevious,
  isSubmitting,
}) => {
  const findings = useMemo(() => {
    return wizardState.items.filter((item) => item.conditionStatus !== 'OK' && item.conditionStatus !== 'NOT_INSPECTED');
  }, [wizardState.items]);

  const chargeableItems = useMemo(() => {
    return findings.filter((item) => item.responsibility === 'TENANT');
  }, [findings]);

  const maintenanceItems = useMemo(() => {
    return findings.filter((item) => item.responsibility !== 'TENANT');
  }, [findings]);

  return (
    <div className="wizard-step-findings">
      <div className="findings-summary">
        <div className="summary-card">
          <h3 className="summary-title">Total Findings</h3>
          <p className="summary-stat">{findings.length} items</p>
        </div>

        <div className="summary-card summary-card--warning">
          <h3 className="summary-title">Charge Candidates</h3>
          <p className="summary-stat">{chargeableItems.length} items</p>
        </div>

        <div className="summary-card summary-card--info">
          <h3 className="summary-title">Maintenance Items</h3>
          <p className="summary-stat">{maintenanceItems.length} items</p>
        </div>
      </div>

      {chargeableItems.length > 0 && (
        <div className="findings-section">
          <h2 className="section-title">⚠ Charge Candidates (Tenant Responsibility)</h2>
          <div className="findings-list">
            {chargeableItems.map((item, idx) => (
              <div key={idx} className="finding-card finding-card--charge">
                <div className="finding-header">
                  <h4 className="finding-title">{item.itemLabel}</h4>
                  <span className={`finding-status finding-status--${item.conditionStatus.toLowerCase()}`}>
                    {item.conditionStatus}
                  </span>
                </div>
                <p className="finding-location">
                  {item.roomKey.split('-').join(' ')} • {item.categoryKey}
                </p>
                {item.notes && <p className="finding-notes">{item.notes}</p>}
                {item.costEstimate && <p className="finding-cost">Est. Cost: ${item.costEstimate.toFixed(2)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {maintenanceItems.length > 0 && (
        <div className="findings-section">
          <h2 className="section-title">🔧 Maintenance Items (Owner Responsibility)</h2>
          <div className="findings-list">
            {maintenanceItems.map((item, idx) => (
              <div key={idx} className="finding-card finding-card--maintenance">
                <div className="finding-header">
                  <h4 className="finding-title">{item.itemLabel}</h4>
                  <span className={`finding-status finding-status--${item.conditionStatus.toLowerCase()}`}>
                    {item.conditionStatus}
                  </span>
                </div>
                <p className="finding-location">
                  {item.roomKey.split('-').join(' ')} • {item.categoryKey}
                </p>
                {item.notes && <p className="finding-notes">{item.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {findings.length === 0 && (
        <div className="empty-state">
          <p>All items are in good condition. No findings to review.</p>
        </div>
      )}

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
  );
};

export default MoveoutInspectionStepFindingsReview;
