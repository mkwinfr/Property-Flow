// src/pages/MakeReadyWizard/steps/MakeReadyStepCreated.tsx
import type { MakeReadyTurnDraft } from '@/types/makeReady';

interface Props {
  turnDraft: MakeReadyTurnDraft;
  onUpdate: (updates: Partial<MakeReadyTurnDraft>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLastStep: boolean;
  isSubmitting: boolean;
}

export default function MakeReadyStepCreated({}: Props) {
  return (
    <div className="wizard-step-content success-content">
      <div className="success-icon">✓</div>
      <h2>Turn Created Successfully!</h2>
      <p>Your make-ready turn has been created and is now ready for the team.</p>
      <p className="success-note">
        Redirecting to Make Ready Board in a moment, or click "Go to Board" to view it now.
      </p>
    </div>
  );
}
