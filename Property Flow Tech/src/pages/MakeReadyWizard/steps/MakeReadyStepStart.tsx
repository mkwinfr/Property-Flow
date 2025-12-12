// src/pages/MakeReadyWizard/steps/MakeReadyStepStart.tsx
import type { MakeReadyTurnDraft } from '@/types/makeReady';

interface Props {
  turnDraft: MakeReadyTurnDraft;
  onUpdate: (updates: Partial<MakeReadyTurnDraft>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLastStep: boolean;
  isSubmitting: boolean;
}

export default function MakeReadyStepStart({ onNext }: Props) {
  return (
    <div className="wizard-step-content">
      <p>Welcome to the Make Ready Wizard. This 10-step process will help you create a new make-ready turn for your property.</p>
      <p>You'll provide:</p>
      <ul>
        <li>Turn details and apartment information</li>
        <li>Move-out condition assessment</li>
        <li>Scope of work</li>
        <li>Tasks and assignments</li>
        <li>Schedule and timeline</li>
        <li>Materials and costs</li>
        <li>Review and confirmation</li>
      </ul>
      <p>Let's get started!</p>
    </div>
  );
}
