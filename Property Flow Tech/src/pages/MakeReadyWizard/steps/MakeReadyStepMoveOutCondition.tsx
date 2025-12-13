// src/pages/MakeReadyWizard/steps/MakeReadyStepMoveOutCondition.tsx
import type { MakeReadyTurnDraft, OverallCondition, ConditionTag } from '@/types/makeReady';

interface Props {
  turnDraft: MakeReadyTurnDraft;
  onUpdate: (updates: Partial<MakeReadyTurnDraft>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLastStep: boolean;
  isSubmitting: boolean;
}

const CONDITIONS: OverallCondition[] = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'SEVERE'];
const TAGS: ConditionTag[] = [
  'HEAVY_TRASH',
  'ODORS',
  'PET_DAMAGE',
  'PESTS',
  'MOLD_MOISTURE',
  'SAFETY_ISSUES',
  'APPLIANCE_ISSUES',
];

export default function MakeReadyStepMoveOutCondition({
  turnDraft,
  onUpdate,
}: Props) {
  const toggleTag = (tag: ConditionTag) => {
    const tags = turnDraft.conditionTags || [];
    const updated = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    onUpdate({ conditionTags: updated });
  };

  return (
    <div className="wizard-step-content">
      <div className="wizard-section">
        <h3 className="wizard-section-title">Unit Condition Assessment</h3>

        <div className="wizard-field">
          <label htmlFor="overallCondition" className="wizard-label">
            Overall Condition
          </label>
          <select
            id="overallCondition"
            value={turnDraft.overallCondition || 'GOOD'}
            onChange={(e) =>
              onUpdate({ overallCondition: e.target.value as OverallCondition })
            }
          >
            {CONDITIONS.map((cond) => (
              <option key={cond} value={cond}>
                {cond}
              </option>
            ))}
          </select>
        </div>

        <div className="wizard-field">
          <label className="wizard-label">Issues Found</label>
          <div className="wizard-pill-grid">
            {TAGS.map((tag) => (
              <label
                key={tag}
                className={`wizard-pill ${
                  turnDraft.conditionTags?.includes(tag) ? 'wizard-pill--checked' : ''
                }`}
              >
                <input
                  type="checkbox"
                  className="wizard-pill__input"
                  checked={turnDraft.conditionTags?.includes(tag) || false}
                  onChange={() => toggleTag(tag)}
                />
                <span className="wizard-pill__check">✓</span>
                <span className="wizard-pill__text">{tag.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="wizard-field">
          <label htmlFor="cleanlinessCondition" className="wizard-label">
            Cleanliness Level
          </label>
          <select
            id="cleanlinessCondition"
            value={turnDraft.cleanlinessCondition || 'BROOM_SWEEP'}
            onChange={(e) =>
              onUpdate({ cleanlinessCondition: e.target.value as any })
            }
          >
            <option value="BROOM_SWEEP">Broom Sweep</option>
            <option value="DIRTY">Dirty</option>
            <option value="BIOHAZARD">Biohazard</option>
          </select>
        </div>
      </div>

      <div className="wizard-section">
        <div className="wizard-field">
          <label htmlFor="photoNotes" className="wizard-label">
            Photo Notes
          </label>
          <textarea
            id="photoNotes"
            placeholder="Notes about photos taken"
            value={turnDraft.photoNotes || ''}
            onChange={(e) => onUpdate({ photoNotes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
