// src/pages/MoveoutInspectionWizard/MoveoutInspectionWizard.tsx
import { useState, useCallback, useEffect } from 'react';
import type { MoveoutInspectionDraft, MoveoutInspectionItemState, MoveoutInspectionWizardState } from '@/types/moveoutInspection';
import { apiUrl } from '@/config/api';
import './MoveoutInspectionWizard.css';

import MoveoutInspectionStepStart from './steps/MoveoutInspectionStepStart';
import MoveoutInspectionStepUnitOverview from './steps/MoveoutInspectionStepUnitOverview';
import MoveoutInspectionStepInspection from './steps/MoveoutInspectionStepInspection';
import MoveoutInspectionStepFindingsReview from './steps/MoveoutInspectionStepFindingsReview';
import MoveoutInspectionStepChargesSummary from './steps/MoveoutInspectionStepChargesSummary';
import MoveoutInspectionStepGenerateWork from './steps/MoveoutInspectionStepGenerateWork';
import MoveoutInspectionStepComplete from './steps/MoveoutInspectionStepComplete';

const steps = [
  { number: 1, title: 'Start', component: MoveoutInspectionStepStart },
  { number: 2, title: 'Unit Overview', component: MoveoutInspectionStepUnitOverview },
  { number: 3, title: 'Inspection', component: MoveoutInspectionStepInspection },
  { number: 4, title: 'Findings Review', component: MoveoutInspectionStepFindingsReview },
  { number: 5, title: 'Charges Summary', component: MoveoutInspectionStepChargesSummary },
  { number: 6, title: 'Generate Work', component: MoveoutInspectionStepGenerateWork },
  { number: 7, title: 'Complete', component: MoveoutInspectionStepComplete },
];

const TOTAL_STEPS = steps.length;

export default function MoveoutInspectionWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardState, setWizardState] = useState<MoveoutInspectionWizardState>({
    inspectionDraft: {
      propertyId: undefined,
      unitId: '',
      apartmentId: undefined,
      inspectionType: 'FINAL',
      inspectionDate: new Date().toISOString().split('T')[0],
      inspectorUserId: undefined,
      notes: '',
    },
    items: [],
    charges: [],
    isSubmitting: false,
    error: null,
  });

  const CurrentStepComponent = steps[currentStep - 1].component;

  const handleStepChange = useCallback((newStep: number) => {
    if (newStep >= 1 && newStep <= TOTAL_STEPS) {
      setCurrentStep(newStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleDraftUpdate = useCallback((updates: Partial<MoveoutInspectionDraft>) => {
    setWizardState((prev) => ({
      ...prev,
      inspectionDraft: { ...prev.inspectionDraft, ...updates },
      error: null,
    }));
  }, []);

  const handleItemsUpdate = useCallback((items: MoveoutInspectionItemState[]) => {
    setWizardState((prev) => ({
      ...prev,
      items,
      error: null,
    }));
  }, []);

  const handleChargesUpdate = useCallback((charges: any[]) => {
    setWizardState((prev) => ({
      ...prev,
      charges,
      error: null,
    }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      handleStepChange(currentStep + 1);
    }
  }, [currentStep, handleStepChange]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      handleStepChange(currentStep - 1);
    }
  }, [currentStep, handleStepChange]);

  const handleSaveDraft = useCallback(async () => {
    setWizardState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      // Create or update inspection
      let inspectionId = wizardState.inspectionId;

      if (!inspectionId) {
        const createResponse = await fetch(apiUrl('/api/moveout-inspections'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(wizardState.inspectionDraft),
        });

        if (!createResponse.ok) {
          throw new Error(`Failed to create inspection: ${createResponse.statusText}`);
        }

        const inspection = await createResponse.json();
        inspectionId = inspection.id;

        setWizardState((prev) => ({
          ...prev,
          inspectionId: inspection.id,
        }));
      }

      // Upsert items
      if (wizardState.items.length > 0) {
        const itemsResponse = await fetch(apiUrl(`/api/moveout-inspections/${inspectionId}/items`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: wizardState.items.map((item) => ({
              templateKey: item.templateKey,
              roomKey: item.roomKey,
              categoryKey: item.categoryKey,
              itemKey: item.itemKey,
              itemLabel: item.itemLabel,
              conditionStatus: item.conditionStatus,
              responsibility: item.responsibility,
              notes: item.notes,
              costEstimate: item.costEstimate,
              severity: item.severity,
            })),
          }),
        });

        if (!itemsResponse.ok) {
          throw new Error(`Failed to save items: ${itemsResponse.statusText}`);
        }
      }

      setWizardState((prev) => ({
        ...prev,
        isSubmitting: false,
      }));
    } catch (err) {
      setWizardState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to save draft',
        isSubmitting: false,
      }));
    }
  }, [wizardState]);

  const handleFinalize = useCallback(async () => {
    setWizardState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      if (!wizardState.inspectionId) {
        throw new Error('No inspection created');
      }

      // Complete the inspection
      const response = await fetch(apiUrl(`/api/moveout-inspections/${wizardState.inspectionId}/complete`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Failed to complete inspection: ${response.statusText}`);
      }

      // Move to complete step
      setCurrentStep(TOTAL_STEPS);

      window.dispatchEvent(
        new CustomEvent('inspection-completed', { detail: { inspectionId: wizardState.inspectionId } })
      );
    } catch (err) {
      setWizardState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to complete inspection',
        isSubmitting: false,
      }));
    }
  }, [wizardState.inspectionId]);

  return (
    <div className="wizard-shell">
      <div className="moveout-inspection-wizard">
        {/* Header section */}
        <div className="wizard-header">
          <div className="wizard-header-top">
            <span className="wizard-step-counter">Step {currentStep} of {TOTAL_STEPS}</span>
            <div className="wizard-header-spacer" />
          </div>
          <h1 className="wizard-page-title">{steps[currentStep - 1].title}</h1>
          {currentStep === 1 && (
            <p className="wizard-page-subtitle">Document unit condition and identify charges</p>
          )}
        </div>

        {/* Progress bar */}
        <div className="wizard-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Step stepper */}
        <div className="wizard-stepper">
          {steps.map((step) => (
            <button
              key={step.number}
              className={`stepper-step ${
                currentStep === step.number ? 'stepper-step--active' : ''
              } ${currentStep > step.number ? 'stepper-step--completed' : ''}`}
              onClick={() => handleStepChange(step.number)}
              disabled={currentStep > TOTAL_STEPS - 1 && step.number !== TOTAL_STEPS}
              title={step.title}
            >
              <span className="stepper-step-number">{step.number}</span>
              {currentStep === step.number && (
                <span className="stepper-step-label">
                  {step.title}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Main content area */}
        <div className="wizard-content">
          {wizardState.error && (
            <div className="wizard-error">
              <strong>Error:</strong> {wizardState.error}
            </div>
          )}

          <div className="wizard-step-content">
            <CurrentStepComponent
              wizardState={wizardState}
              onDraftUpdate={handleDraftUpdate}
              onItemsUpdate={handleItemsUpdate}
              onChargesUpdate={handleChargesUpdate}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onSaveDraft={handleSaveDraft}
              onFinalize={handleFinalize}
              isSubmitting={wizardState.isSubmitting}
            />
          </div>

          {/* Navigation footer */}
          <div className="wizard-footer">
            <button
              className="btn btn-secondary"
              onClick={handlePrevious}
              disabled={currentStep === 1 || wizardState.isSubmitting}
            >
              ← Back
            </button>

            <button
              className="btn btn-tertiary"
              onClick={handleSaveDraft}
              disabled={wizardState.isSubmitting}
            >
              {wizardState.isSubmitting ? 'Saving...' : 'Save Draft'}
            </button>

            <button
              className="btn btn-primary"
              onClick={handleNext}
              disabled={currentStep === TOTAL_STEPS || wizardState.isSubmitting}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
