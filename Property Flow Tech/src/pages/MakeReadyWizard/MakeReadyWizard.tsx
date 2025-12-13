// src/pages/MakeReadyWizard/MakeReadyWizard.tsx
import { useState, useCallback } from 'react';
import type { MakeReadyTurnDraft } from '@/types/makeReady';
import { useMakeReadyBoard } from '@/hooks/useMakeReadyBoard';
import './MakeReadyWizard.css';

import MakeReadyStepStart from './steps/MakeReadyStepStart.tsx';
import MakeReadyStepTurnDetails from './steps/MakeReadyStepTurnDetails.tsx';
import MakeReadyStepMoveOutCondition from './steps/MakeReadyStepMoveOutCondition.tsx';
import MakeReadyStepScope from './steps/MakeReadyStepScope.tsx';
import MakeReadyStepTasks from './steps/MakeReadyStepTasks.tsx';
import MakeReadyStepAssignments from './steps/MakeReadyStepAssignments.tsx';
import MakeReadyStepSchedule from './steps/MakeReadyStepSchedule.tsx';
import MakeReadyStepReview from './steps/MakeReadyStepReview.tsx';
import MakeReadyStepCreated from './steps/MakeReadyStepCreated.tsx';

const steps = [
  { number: 1, title: 'Start', component: MakeReadyStepStart },
  { number: 2, title: 'Details', component: MakeReadyStepTurnDetails },
  { number: 3, title: 'Condition', component: MakeReadyStepMoveOutCondition },
  { number: 4, title: 'Scope', component: MakeReadyStepScope },
  { number: 5, title: 'Tasks', component: MakeReadyStepTasks },
  { number: 6, title: 'Assignments', component: MakeReadyStepAssignments },
  { number: 7, title: 'Schedule', component: MakeReadyStepSchedule },
  { number: 8, title: 'Review', component: MakeReadyStepReview },
  { number: 9, title: 'Created', component: MakeReadyStepCreated },
];

const TOTAL_STEPS = steps.length;

export interface MakeReadyWizardState {
  turnDraft: MakeReadyTurnDraft;
  isSubmitting: boolean;
  error: string | null;
}

export default function MakeReadyWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardState, setWizardState] = useState<MakeReadyWizardState>({
    turnDraft: {
      propertyId: '',
      unitId: '',
      turnType: 'STANDARD_MOVE_OUT',
      moveOutDate: new Date().toISOString(),
      targetReadyDate: new Date().toISOString(),
      priority: 'NORMAL',
      turnOwnerId: '',
      turnNotes: '',
      overallCondition: 'GOOD',
      accessMethod: 'ON_VENDOR',
      conditionTags: [],
      selectedCategories: [],
      useTemplateTasks: false,
      scopeSpecialInstructions: '',
      tasks: [],
      materials: [],
    },
    isSubmitting: false,
    error: null,
  });

  const { addTurn } = useMakeReadyBoard();

  const CurrentStepComponent = steps[currentStep - 1].component;

  const handleStepChange = useCallback((newStep: number) => {
    if (newStep >= 1 && newStep <= TOTAL_STEPS) {
      setCurrentStep(newStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleDraftUpdate = useCallback((updates: Partial<MakeReadyTurnDraft>) => {
    setWizardState((prev) => ({
      ...prev,
      turnDraft: { ...prev.turnDraft, ...updates },
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

  const handleSubmit = useCallback(async () => {
    setWizardState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const { accessMethod, ...restDraft } = wizardState.turnDraft;
      const payload = {
        ...restDraft,
        accessInstructions:
          accessMethod === 'RESIDENT_KEYS'
            ? 'Resident Keys'
            : accessMethod === 'ON_VENDOR'
            ? 'On Vendor'
            : undefined,
      };

      const response = await fetch('/api/make-ready-turns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to create turn: ${response.statusText}`);
      }

      const newTurn = await response.json();
      addTurn(newTurn);

      // Move to success step
      setCurrentStep(TOTAL_STEPS);

      // Auto-navigate to board and open the new turn
      window.dispatchEvent(
        new CustomEvent('turn-created', { detail: { turnId: newTurn.id } })
      );
      window.dispatchEvent(
        new CustomEvent('navigate-to-board', { detail: { turnId: newTurn.id } })
      );
    } catch (err) {
      setWizardState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to create turn',
      }));
      // Stay on review step so user can correct and retry
      setCurrentStep(TOTAL_STEPS - 1);
    } finally {
      setWizardState((prev) => ({ ...prev, isSubmitting: false }));
    }
  }, [wizardState.turnDraft, addTurn]);

  return (
    <div className="wizard-shell">
      <div className="make-ready-wizard">
        {/* Header section */}
        <div className="wizard-header">
          <div className="wizard-header-top">
            <span className="wizard-step-counter">Step {currentStep} of {TOTAL_STEPS}</span>
            <div className="wizard-header-spacer" />
          </div>
          <h1 className="wizard-page-title">{steps[currentStep - 1].title}</h1>
          {currentStep === 1 && (
            <p className="wizard-page-subtitle">Set up your make-ready turn with guided steps</p>
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
              turnDraft={wizardState.turnDraft}
              onUpdate={handleDraftUpdate}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isLastStep={currentStep === TOTAL_STEPS - 1}
              isSubmitting={wizardState.isSubmitting}
            />
          </div>
        </div>

        {/* Navigation footer */}
        {currentStep === 1 ? (
          <div className="wizard-footer wizard-footer--centered">
            <button
              className="wizard-btn wizard-btn-primary"
              onClick={handleNext}
            >
              Begin
            </button>
          </div>
        ) : (
          <div className="wizard-footer">
            <button
              className="wizard-btn wizard-btn-secondary"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              ← Back
            </button>

            <div className="wizard-footer-spacer" />

            {currentStep < TOTAL_STEPS - 1 && (
              <button className="wizard-btn wizard-btn-primary" onClick={handleNext}>
                Next →
              </button>
            )}

            {currentStep === TOTAL_STEPS - 1 && (
              <button
                className="wizard-btn wizard-btn-primary"
                onClick={handleSubmit}
                disabled={wizardState.isSubmitting}
              >
                {wizardState.isSubmitting ? 'Creating...' : 'Create Turn'}
              </button>
            )}

            {currentStep === TOTAL_STEPS && (
              <button
                className="wizard-btn wizard-btn-primary"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('navigate-to-board', { detail: { turnId: null } })
                  );
                }}
              >
                Go to Board
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

}
