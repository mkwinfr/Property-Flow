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
}: Props) {
  const toggleCategory = (cat: WorkCategory) => {
    const cats = turnDraft.selectedCategories || [];
    const updated = cats.includes(cat) ? cats.filter((c) => c !== cat) : [...cats, cat];
    onUpdate({ selectedCategories: updated });
  };

  return (
    <div className="wizard-step-content">
      <div className="wizard-section">
        <h3 className="wizard-section-title">Work Categories</h3>
        <p style={{ color: '#d0d0d0', marginBottom: '1.5rem' }}>
          Select the categories of work needed for this turn:
        </p>

        <div className="wizard-checkbox-group">
          {WORK_CATEGORIES.map((cat) => (
            <div key={cat} className="wizard-checkbox-item">
              <input
                type="checkbox"
                id={`cat-${cat}`}
                checked={turnDraft.selectedCategories?.includes(cat) || false}
                onChange={() => toggleCategory(cat)}
              />
              <label htmlFor={`cat-${cat}`}>
                {cat.replace(/_/g, ' ')}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="wizard-section">
        <div className="wizard-field">
          <label htmlFor="scopeSpecialInstructions" className="wizard-label">
            Special Instructions
          </label>
          <textarea
            id="scopeSpecialInstructions"
            placeholder="Any special instructions for this turn"
            value={turnDraft.scopeSpecialInstructions || ''}
            onChange={(e) => onUpdate({ scopeSpecialInstructions: e.target.value })}
          />
        </div>

        <div className="wizard-checkbox-group">
          <div className="wizard-checkbox-item">
            <input
              type="checkbox"
              id="useTemplateTasks"
              checked={turnDraft.useTemplateTasks || false}
              onChange={(e) => onUpdate({ useTemplateTasks: e.target.checked })}
            />
            <label htmlFor="useTemplateTasks">
              Use template tasks for selected categories
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
