// src/pages/MoveoutInspectionWizard/components/MoveoutInspectionRoom.tsx
import React, { useState } from 'react';
import type { MoveoutInspectionItemState } from '@/types/moveoutInspection';
import '../MoveoutInspectionWizard.css';

interface Props {
  roomKey: string;
  items: MoveoutInspectionItemState[];
  onItemUpdate: (itemIndex: number, updates: Partial<MoveoutInspectionItemState>) => void;
  onApplyToAll?: (value: string) => void;
  isSubmitting: boolean;
}

const MoveoutInspectionRoom: React.FC<Props> = ({
  roomKey,
  items,
  onItemUpdate,
  onApplyToAll,
  isSubmitting,
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleExpanded = (index: number) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedItems(newSet);
  };

  // Group items by category
  const itemsByCategory = new Map<string, (MoveoutInspectionItemState & { originalIndex: number })[]>();
  items.forEach((item, index) => {
    if (!itemsByCategory.has(item.categoryKey)) {
      itemsByCategory.set(item.categoryKey, []);
    }
    itemsByCategory.get(item.categoryKey)!.push({ ...item, originalIndex: index });
  });

  const roomLabel = roomKey
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <div className="inspection-room">
      <div className="room-header">
        <h2 className="room-title">{roomLabel}</h2>
        <div className="room-actions">
          <button
            className="btn btn-small btn-secondary"
            onClick={() => onApplyToAll?.('OK')}
            disabled={isSubmitting}
            type="button"
            title="Mark all items in this room as OK"
          >
            Mark All OK
          </button>
        </div>
      </div>

      <div className="room-categories">
        {Array.from(itemsByCategory.entries()).map(([categoryKey, categoryItems]) => (
          <div key={categoryKey} className="category-group">
            <h3 className="category-title">
              {categoryKey
                .split('-')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ')}
            </h3>

            <div className="items-list">
              {categoryItems.map((item, catIndex) => {
                const isExpanded = expandedItems.has(item.originalIndex);
                const conditionColor = {
                  OK: 'item--ok',
                  WEAR: 'item--wear',
                  DAMAGE: 'item--damage',
                  MISSING: 'item--missing',
                  NOT_INSPECTED: 'item--not-inspected',
                }[item.conditionStatus] || '';

                return (
                  <div
                    key={`${categoryKey}-${item.itemKey}`}
                    className={`inspection-item ${conditionColor} ${isExpanded ? 'item--expanded' : ''}`}
                  >
                    <div
                      className="item-header"
                      onClick={() => toggleExpanded(item.originalIndex)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="item-label">
                        <span className="item-name">{item.itemLabel}</span>
                        {item.conditionStatus !== 'NOT_INSPECTED' && (
                          <span className="item-status-badge">{item.conditionStatus}</span>
                        )}
                      </div>

                      {isExpanded ? (
                        <span className="item-toggle">▼</span>
                      ) : (
                        <span className="item-toggle">▶</span>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="item-details">
                        <div className="condition-buttons">
                          <button
                            className={`condition-btn ${item.conditionStatus === 'OK' ? 'condition-btn--active' : ''}`}
                            onClick={() =>
                              onItemUpdate(item.originalIndex, {
                                conditionStatus: 'OK',
                                responsibility: 'OWNER',
                              })
                            }
                            disabled={isSubmitting}
                            type="button"
                          >
                            ✓ OK
                          </button>

                          <button
                            className={`condition-btn ${item.conditionStatus === 'WEAR' ? 'condition-btn--active' : ''}`}
                            onClick={() =>
                              onItemUpdate(item.originalIndex, {
                                conditionStatus: 'WEAR',
                                responsibility: 'OWNER',
                              })
                            }
                            disabled={isSubmitting}
                            type="button"
                            title="Normal wear & tear"
                          >
                            ⚠ Wear
                          </button>

                          <button
                            className={`condition-btn ${item.conditionStatus === 'DAMAGE' ? 'condition-btn--active' : ''}`}
                            onClick={() =>
                              onItemUpdate(item.originalIndex, {
                                conditionStatus: 'DAMAGE',
                                responsibility: 'TENANT',
                              })
                            }
                            disabled={isSubmitting}
                            type="button"
                            title="Damage - charge candidate"
                          >
                            ✗ Damage
                          </button>

                          <button
                            className={`condition-btn ${item.conditionStatus === 'MISSING' ? 'condition-btn--active' : ''}`}
                            onClick={() =>
                              onItemUpdate(item.originalIndex, {
                                conditionStatus: 'MISSING',
                                responsibility: 'TENANT',
                              })
                            }
                            disabled={isSubmitting}
                            type="button"
                          >
                            ⊘ Missing
                          </button>

                          <button
                            className={`condition-btn ${item.conditionStatus === 'NOT_INSPECTED' ? 'condition-btn--active' : ''}`}
                            onClick={() =>
                              onItemUpdate(item.originalIndex, {
                                conditionStatus: 'NOT_INSPECTED',
                              })
                            }
                            disabled={isSubmitting}
                            type="button"
                          >
                            ? Not Checked
                          </button>
                        </div>

                        <div className="item-fields">
                          <label className="form-label">Responsibility</label>
                          <select
                            className="form-input form-input--sm"
                            value={item.responsibility}
                            onChange={(e) =>
                              onItemUpdate(item.originalIndex, { responsibility: e.target.value as any })
                            }
                            disabled={isSubmitting}
                          >
                            <option value="UNSURE">Unsure</option>
                            <option value="OWNER">Owner</option>
                            <option value="TENANT">Tenant</option>
                          </select>

                          <label className="form-label">Notes</label>
                          <textarea
                            className="form-input form-input--sm form-textarea"
                            placeholder="Details, observations, etc."
                            value={item.notes}
                            onChange={(e) =>
                              onItemUpdate(item.originalIndex, { notes: e.target.value })
                            }
                            disabled={isSubmitting}
                            rows={2}
                          />

                          <label className="form-label">Cost Estimate ($)</label>
                          <input
                            type="number"
                            className="form-input form-input--sm"
                            placeholder="0.00"
                            value={item.costEstimate || ''}
                            onChange={(e) =>
                              onItemUpdate(item.originalIndex, {
                                costEstimate: e.target.value ? parseFloat(e.target.value) : undefined,
                              })
                            }
                            disabled={isSubmitting}
                            step="0.01"
                            min="0"
                          />

                          <label className="form-label">Severity (1-5)</label>
                          <input
                            type="number"
                            className="form-input form-input--sm"
                            placeholder="1-5"
                            value={item.severity || ''}
                            onChange={(e) =>
                              onItemUpdate(item.originalIndex, {
                                severity: e.target.value ? parseInt(e.target.value) : undefined,
                              })
                            }
                            disabled={isSubmitting}
                            min="1"
                            max="5"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MoveoutInspectionRoom;
