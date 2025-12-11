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
import MakeReadyStepMaterials from './steps/MakeReadyStepMaterials.tsx';
import MakeReadyStepReview from './steps/MakeReadyStepReview.tsx';
import MakeReadyStepCreated from './steps/MakeReadyStepCreated.tsx';

const TOTAL_STEPS = 10;

const steps = [
  { number: 1, title: 'Start', component: MakeReadyStepStart },
  { number: 2, title: 'Turn Details', component: MakeReadyStepTurnDetails },
  { number: 3, title: 'Move Out Condition', component: MakeReadyStepMoveOutCondition },
  { number: 4, title: 'Scope', component: MakeReadyStepScope },
  { number: 5, title: 'Tasks', component: MakeReadyStepTasks },
  { number: 6, title: 'Assignments', component: MakeReadyStepAssignments },
  { number: 7, title: 'Schedule', component: MakeReadyStepSchedule },
  { number: 8, title: 'Materials', component: MakeReadyStepMaterials },
  { number: 9, title: 'Review', component: MakeReadyStepReview },
  { number: 10, title: 'Created', component: MakeReadyStepCreated },
];

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
      const response = await fetch('/api/make-ready-turns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wizardState.turnDraft),
      });

      if (!response.ok) {
        throw new Error(`Failed to create turn: ${response.statusText}`);
      }

      const newTurn = await response.json();
      addTurn(newTurn);

      // Move to success step
      setCurrentStep(TOTAL_STEPS);

      // Auto-navigate to board after 2 seconds
      setTimeout(() => {
        // Trigger navigation - this would be handled by parent Dashboard component
        window.dispatchEvent(
          new CustomEvent('navigate-to-board', { detail: { turnId: newTurn.id } })
        );
      }, 2000);
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
    <div className="make-ready-wizard">
      {/* Progress indicator */}
      <div className="wizard-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <div className="progress-text">
          Step {currentStep} of {TOTAL_STEPS}
        </div>
      </div>

      {/* Step indicators */}
      <div className="wizard-steps-nav">
        {steps.map((step) => (
          <button
            key={step.number}
            className={`step-indicator ${
              currentStep === step.number ? 'active' : ''
            } ${currentStep > step.number ? 'completed' : ''}`}
            onClick={() => handleStepChange(step.number)}
            disabled={currentStep > TOTAL_STEPS - 1 && step.number !== TOTAL_STEPS}
            title={step.title}
          >
            {step.number}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="wizard-content">
        <h2 className="wizard-step-title">{steps[currentStep - 1].title}</h2>

        {wizardState.error && (
          <div className="wizard-error">
            <strong>Error:</strong> {wizardState.error}
          </div>
        )}

        <CurrentStepComponent
          turnDraft={wizardState.turnDraft}
          onUpdate={handleDraftUpdate}
          onNext={handleNext}
          onPrevious={handlePrevious}
          isLastStep={currentStep === TOTAL_STEPS - 1}
          isSubmitting={wizardState.isSubmitting}
        />
      </div>

      {/* Navigation buttons */}
      <div className="wizard-navigation">
        <button
          className="wizard-btn wizard-btn-secondary"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          Back
        </button>

        {currentStep < TOTAL_STEPS - 1 && (
          <button className="wizard-btn wizard-btn-primary" onClick={handleNext}>
            Next
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
    </div>
  );
}
