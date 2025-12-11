// src/pages/MakeReadyWizard/steps/MakeReadyStepScope.tsx
import type { MakeReadyTurnDraft, WorkCategory } from '@/types/makeReady';

interface Props {
  turnDraft: MakeReadyTurnDraft;
  onUpdate: (updates: Partial<MakeReadyTurnDraft>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLastStep: boolean;
  isSubmitting: boolean;
}

const WORK_CATEGORIES: WorkCategory[] = [
  'GENERAL_MAINTENANCE',
  'PAINT',
  'CLEANING',
  'FLOORING',
  'APPLIANCES',
  'HVAC',
  'PLUMBING',
  'ELECTRICAL',
  'PEST_CONTROL',
  'TRASH_OUT',
  'VENDOR_SPECIALTY',
  'OTHER',
];

export default function MakeReadyStepScope({
  turnDraft,
  onUpdate,
  onNext,
}: Props) {
  const toggleCategory = (cat: WorkCategory) => {
    const cats = turnDraft.selectedCategories || [];
    const updated = cats.includes(cat) ? cats.filter((c) => c !== cat) : [...cats, cat];
    onUpdate({ selectedCategories: updated });
  };

  return (
    <div className="wizard-step-content">
      <p>Select the categories of work needed for this turn:</p>

      <div className="checkbox-group">
        {WORK_CATEGORIES.map((cat) => (
          <label key={cat} className="checkbox-label">
            <input
              type="checkbox"
              checked={turnDraft.selectedCategories?.includes(cat) || false}
              onChange={() => toggleCategory(cat)}
            />
            {cat.replace(/_/g, ' ')}
          </label>
        ))}
      </div>

      <div className="form-group">
        <label htmlFor="scopeSpecialInstructions">Special Instructions</label>
        <textarea
          id="scopeSpecialInstructions"
          placeholder="Any special instructions for this turn"
          value={turnDraft.scopeSpecialInstructions || ''}
          onChange={(e) => onUpdate({ scopeSpecialInstructions: e.target.value })}
          className="form-textarea"
        />
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={turnDraft.useTemplateTasks || false}
            onChange={(e) => onUpdate({ useTemplateTasks: e.target.checked })}
          />
          Use template tasks for selected categories
        </label>
      </div>

      <button
        className="wizard-btn wizard-btn-primary"
        onClick={onNext}
        disabled={!turnDraft.selectedCategories || turnDraft.selectedCategories.length === 0}
      >
        Continue
      </button>
    </div>
  );
}
