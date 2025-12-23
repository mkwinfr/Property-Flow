// src/pages/MoveoutInspectionWizard/steps/MoveoutInspectionStepInspection.tsx
import React, { useState, useEffect } from 'react';
import type { MoveoutInspectionItemState, MoveoutInspectionWizardState } from '@/types/moveoutInspection';
import { getTemplateItemsByRoom, getAllTemplateItems } from '@/data/moveoutInspectionTemplate';
import MoveoutInspectionRoom from '../components/MoveoutInspectionRoom';

interface Props {
  wizardState: MoveoutInspectionWizardState;
  onItemsUpdate: (items: MoveoutInspectionItemState[]) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSaveDraft: () => Promise<void>;
  isSubmitting: boolean;
}

const MoveoutInspectionStepInspection: React.FC<Props> = ({
  wizardState,
  onItemsUpdate,
  onNext,
  onPrevious,
  onSaveDraft,
  isSubmitting,
}) => {
  const [roomStates, setRoomStates] = useState<Map<string, MoveoutInspectionItemState[]>>(new Map());
  const [activeRoom, setActiveRoom] = useState<string | null>(null);

  // Initialize items from template if not already done
  useEffect(() => {
    if (wizardState.items.length === 0) {
      const allItems = getAllTemplateItems();
      const itemMap = new Map<string, MoveoutInspectionItemState[]>();

      for (const item of allItems) {
        const roomKey = item.roomKey;
        if (!itemMap.has(roomKey)) {
          itemMap.set(roomKey, []);
        }

        itemMap.get(roomKey)!.push({
          templateKey: item.templateKey,
          roomKey: item.roomKey,
          categoryKey: item.categoryKey,
          itemKey: item.itemKey,
          itemLabel: item.itemLabel,
          conditionStatus: 'NOT_INSPECTED',
          responsibility: 'UNSURE',
          notes: '',
          costEstimate: undefined,
          severity: undefined,
          media: [],
        });
      }

      setRoomStates(itemMap);
      if (itemMap.size > 0) {
        setActiveRoom(Array.from(itemMap.keys())[0]);
      }
    } else {
      // Restore from wizard state
      const itemMap = new Map<string, MoveoutInspectionItemState[]>();
      for (const item of wizardState.items) {
        const roomKey = item.roomKey;
        if (!itemMap.has(roomKey)) {
          itemMap.set(roomKey, []);
        }
        itemMap.get(roomKey)!.push(item);
      }
      setRoomStates(itemMap);
    }
  }, [wizardState.items.length]);

  const handleItemUpdate = (roomKey: string, itemIndex: number, updates: Partial<MoveoutInspectionItemState>) => {
    setRoomStates((prev) => {
      const newMap = new Map(prev);
      const room = newMap.get(roomKey);
      if (room) {
        room[itemIndex] = { ...room[itemIndex], ...updates };
      }
      return newMap;
    });
  };

  const handleApplyToAll = (value: string) => {
    // Apply condition to all items in current room
    if (!activeRoom) return;

    setRoomStates((prev) => {
      const newMap = new Map(prev);
      const room = newMap.get(activeRoom);
      if (room) {
        room.forEach((item) => {
          item.conditionStatus = value as any;
        });
      }
      return newMap;
    });
  };

  const handleNext = async () => {
    // Flatten room states back to items array
    const allItems: MoveoutInspectionItemState[] = [];
    roomStates.forEach((items) => {
      allItems.push(...items);
    });
    onItemsUpdate(allItems);

    // Save draft before proceeding
    await onSaveDraft();
    onNext();
  };

  const rooms = Array.from(roomStates.keys());
  const currentRoomItems = activeRoom ? roomStates.get(activeRoom) : [];

  return (
    <div className="wizard-step-inspection">
      <div className="inspection-container">
        {/* Room navigation */}
        <div className="rooms-nav">
          <h3 className="nav-heading">Rooms</h3>
          <div className="rooms-list">
            {rooms.map((roomKey) => {
              const items = roomStates.get(roomKey) || [];
              const inspectedCount = items.filter((i) => i.conditionStatus !== 'NOT_INSPECTED').length;
              const isActive = roomKey === activeRoom;

              return (
                <button
                  key={roomKey}
                  className={`room-btn ${isActive ? 'room-btn--active' : ''}`}
                  onClick={() => setActiveRoom(roomKey)}
                  disabled={isSubmitting}
                >
                  <span className="room-name">
                    {roomKey
                      .split('-')
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ')}
                  </span>
                  <span className="room-progress">
                    {inspectedCount}/{items.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Room content */}
        <div className="inspection-content">
          {activeRoom && currentRoomItems && (
            <MoveoutInspectionRoom
              roomKey={activeRoom}
              items={currentRoomItems}
              onItemUpdate={(itemIndex, updates) => handleItemUpdate(activeRoom, itemIndex, updates)}
              onApplyToAll={handleApplyToAll}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>

      <div className="wizard-actions">
        <button
          className="btn btn-secondary"
          onClick={onPrevious}
          disabled={isSubmitting}
          type="button"
        >
          ← Back
        </button>
        <button
          className="btn btn-primary"
          onClick={handleNext}
          disabled={isSubmitting}
          type="button"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default MoveoutInspectionStepInspection;
