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
  onNext,
}: Props) {
  const toggleTag = (tag: ConditionTag) => {
    const tags = turnDraft.conditionTags || [];
    const updated = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    onUpdate({ conditionTags: updated });
  };

  return (
    <div className="wizard-step-content">
      <div className="form-group">
        <label htmlFor="overallCondition">Overall Condition</label>
        <select
          id="overallCondition"
          value={turnDraft.overallCondition || 'GOOD'}
          onChange={(e) =>
            onUpdate({ overallCondition: e.target.value as OverallCondition })
          }
          className="form-select"
        >
          {CONDITIONS.map((cond) => (
            <option key={cond} value={cond}>
              {cond}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Issues Found</label>
        <div className="checkbox-group">
          {TAGS.map((tag) => (
            <label key={tag} className="checkbox-label">
              <input
                type="checkbox"
                checked={turnDraft.conditionTags?.includes(tag) || false}
                onChange={() => toggleTag(tag)}
              />
              {tag.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="photoNotes">Photo Notes</label>
        <textarea
          id="photoNotes"
          placeholder="Notes about photos taken"
          value={turnDraft.photoNotes || ''}
          onChange={(e) => onUpdate({ photoNotes: e.target.value })}
          className="form-textarea"
        />
      </div>

      <div className="form-group">
        <label htmlFor="cleanlinessCondition">Cleanliness Level</label>
        <select
          id="cleanlinessCondition"
          value={turnDraft.cleanlinessCondition || 'BROOM_SWEEP'}
          onChange={(e) =>
            onUpdate({ cleanlinessCondition: e.target.value as any })
          }
          className="form-select"
        >
          <option value="BROOM_SWEEP">Broom Sweep</option>
          <option value="DIRTY">Dirty</option>
          <option value="BIOHAZARD">Biohazard</option>
        </select>
      </div>

      <button className="wizard-btn wizard-btn-primary" onClick={onNext}>
        Continue
      </button>
    </div>
  );
}
