// src/pages/MakeReadyWizard/steps/MakeReadyStepScope.tsx
import type { MakeReadyTurnDraft, WorkCategory } from '../../../types/makeReady';

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
  const formatCategory = (cat: WorkCategory) =>
    cat === 'GENERAL_MAINTENANCE' ? 'Gen Maintenance' : cat.replace(/_/g, ' ');

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

        <div className="wizard-pill-grid">
          {WORK_CATEGORIES.map((cat) => (
            <label
              key={cat}
              className={`wizard-pill ${
                turnDraft.selectedCategories?.includes(cat) ? 'wizard-pill--checked' : ''
              }`}
            >
              <input
                type="checkbox"
                className="wizard-pill__input"
                checked={turnDraft.selectedCategories?.includes(cat) || false}
                onChange={() => toggleCategory(cat)}
              />
              <span className="wizard-pill__check">✓</span>
              <span className="wizard-pill__text">{formatCategory(cat)}</span>
            </label>
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

        <div className="wizard-pill-grid wizard-pill-grid--single">
          <label
            className={`wizard-pill ${turnDraft.useTemplateTasks ? 'wizard-pill--checked' : ''}`}
          >
            <input
              type="checkbox"
              className="wizard-pill__input"
              checked={turnDraft.useTemplateTasks || false}
              onChange={(e) => onUpdate({ useTemplateTasks: e.target.checked })}
            />
            <span className="wizard-pill__check">✓</span>
            <span className="wizard-pill__text">
              Use template tasks for selected categories
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
