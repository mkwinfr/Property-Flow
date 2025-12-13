// src/pages/MakeReadyWizard/steps/MakeReadyStepCreated.tsx
import type { MakeReadyTurnDraft } from '../../../types/makeReady';

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
    <div className="wizard-success-container">
      <div className="wizard-success-icon">✓</div>
      <h2 className="wizard-success-title">Turn Created Successfully!</h2>
      <p className="wizard-success-message">
        Your make-ready turn has been created and is now ready for the team.
      </p>
      <p style={{ color: '#9ca3af', fontSize: '13px' }}>
        Redirecting to Make Ready Board in a moment, or click "Go to Board" to view it now.
      </p>
    </div>
  );
}
