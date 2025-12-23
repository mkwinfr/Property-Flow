// src/pages/MoveoutInspectionWizard/steps/MoveoutInspectionStepChargesSummary.tsx
import React, { useEffect, useState } from 'react';
import type { MoveoutChargeLineItem } from '@/types/moveoutInspection';
import { apiUrl } from '@/config/api';

interface Props {
  wizardState: any;
  onChargesUpdate: (charges: MoveoutChargeLineItem[]) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSaveDraft: () => Promise<void>;
  isSubmitting: boolean;
}

const MoveoutInspectionStepChargesSummary: React.FC<Props> = ({
  wizardState,
  onChargesUpdate,
  onNext,
  onPrevious,
  onSaveDraft,
  isSubmitting,
}) => {
  const [charges, setCharges] = useState<MoveoutChargeLineItem[]>(wizardState.charges || []);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateCharges = async () => {
    if (!wizardState.inspectionId) return;

    setIsGenerating(true);
    try {
      const response = await fetch(
        apiUrl(`/api/moveout-inspections/${wizardState.inspectionId}/charges`),
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }
      );

      if (response.ok) {
        const data = await response.json();
        setCharges(data.charges || []);
        onChargesUpdate(data.charges || []);
      }
    } catch (err) {
      console.error('Failed to generate charges', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChargeUpdate = (index: number, updates: Partial<MoveoutChargeLineItem>) => {
    const updated = [...charges];
    updated[index] = { ...updated[index], ...updates };
    setCharges(updated);
    onChargesUpdate(updated);
  };

  const handleRemoveCharge = (index: number) => {
    const updated = charges.filter((_, i) => i !== index);
    setCharges(updated);
    onChargesUpdate(updated);
  };

  const totalAmount = charges
    .filter((c) => c.status !== 'REMOVED')
    .reduce((sum, c) => sum + c.amount, 0);

  const handleNext = async () => {
    await onSaveDraft();
    onNext();
  };

  return (
    <div className="wizard-step-charges">
      <div className="charges-header">
        <h2>Proposed Charges</h2>
        <button
          className="btn btn-secondary"
          onClick={handleGenerateCharges}
          disabled={isGenerating || isSubmitting}
          type="button"
        >
          {isGenerating ? 'Generating...' : '+ Generate from Findings'}
        </button>
      </div>

      {charges.length === 0 ? (
        <div className="empty-state">
          <p>No charges proposed yet. Click "Generate from Findings" to create charge line items from inspection findings.</p>
        </div>
      ) : (
        <>
          <div className="charges-list">
            {charges.map((charge, idx) => (
              <div key={idx} className={`charge-item charge-item--${charge.status}`}>
                <div className="charge-content">
                  <input
                    type="text"
                    className="form-input form-input--sm"
                    value={charge.description}
                    onChange={(e) =>
                      handleChargeUpdate(idx, { description: e.target.value })
                    }
                    placeholder="Description"
                    disabled={isSubmitting}
                  />

                  <div className="charge-amount">
                    <span>$</span>
                    <input
                      type="number"
                      className="form-input form-input--sm form-input--numeric"
                      value={charge.amount}
                      onChange={(e) =>
                        handleChargeUpdate(idx, { amount: parseFloat(e.target.value) || 0 })
                      }
                      disabled={isSubmitting}
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <select
                    className="form-input form-input--sm"
                    value={charge.status}
                    onChange={(e) =>
                      handleChargeUpdate(idx, { status: e.target.value as any })
                    }
                    disabled={isSubmitting}
                  >
                    <option value="PROPOSED">Proposed</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REMOVED">Removed</option>
                  </select>

                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => handleRemoveCharge(idx)}
                    disabled={isSubmitting}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="charges-summary">
            <div className="summary-line">
              <span>Total Proposed Charges:</span>
              <span className="summary-amount">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </>
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
          onClick={handleNext}
          disabled={isSubmitting}
          type="button"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default MoveoutInspectionStepChargesSummary;
