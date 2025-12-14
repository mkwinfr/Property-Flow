// src/pages/MakeReadyWizard/steps/MakeReadyStepTurnDetails.tsx
import { useState, useEffect } from 'react';
import { apiUrl } from '@/config/api';
import type { MakeReadyTurnDraft, TurnType, PriorityLevel } from '../../../types/makeReady';

interface Props {
  turnDraft: MakeReadyTurnDraft;
  onUpdate: (updates: Partial<MakeReadyTurnDraft>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLastStep: boolean;
  isSubmitting: boolean;
}

interface Building {
  id: number;
  propertyId: number;
  buildingNumber: string;
  name?: string;
}

interface Apartment {
  id: number;
  propertyId: number;
  buildingId: number;
  unitNumber: string;
  building?: string;
  beds?: number;
  baths?: number;
}

const TURN_TYPES: TurnType[] = ['STANDARD_MOVE_OUT', 'TRANSFER', 'RENOVATION', 'SPECIAL'];
const PRIORITY_LEVELS: PriorityLevel[] = ['LOW', 'NORMAL', 'HIGH', 'DOWN_UNIT'];

export default function MakeReadyStepTurnDetails({
  turnDraft,
  onUpdate,
}: Props) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [buildingsLoading, setBuildingsLoading] = useState(false);
  const [buildingsError, setBuildingsError] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);

  // Fetch buildings (assuming propertyId is available - adjust as needed for your app)
  useEffect(() => {
    const fetchBuildings = async () => {
      setBuildingsLoading(true);
      setBuildingsError(null);
      try {
        // Adjust this endpoint based on your API structure
        // If you have a propertyId in context, use it here
        const response = await fetch(apiUrl('/api/buildings'));
        if (!response.ok) throw new Error('Failed to load buildings');
        const data = await response.json();
        setBuildings(Array.isArray(data) ? data : data.buildings || []);
      } catch (err) {
        setBuildingsError(err instanceof Error ? err.message : 'Failed to load buildings');
      } finally {
        setBuildingsLoading(false);
      }
    };

    fetchBuildings();
  }, []);

  // Fetch apartments when building is selected
  useEffect(() => {
    if (!selectedBuildingId) {
      setApartments([]);
      return;
    }

    const fetchApartments = async () => {
      try {
        const response = await fetch(
          apiUrl(`/api/buildings/${selectedBuildingId}/apartments`)
        );
        if (!response.ok) throw new Error('Failed to load apartments');
        const data = await response.json();
        setApartments(Array.isArray(data) ? data : data.apartments || []);
      } catch (err) {
        setApartments([]);
      }
    };

    fetchApartments();
  }, [selectedBuildingId]);

  const handleBuildingChange = (buildingId: string) => {
    const id = buildingId ? Number(buildingId) : null;
    setSelectedBuildingId(id);
    onUpdate({ propertyId: buildingId, unitId: '' });
  };

  const handleApartmentChange = (apartmentId: string) => {
    onUpdate({ unitId: apartmentId });
  };

  return (
    <div className="wizard-step-content">
      <div className="wizard-section">
        <h3 className="wizard-section-title">Turn Information</h3>

        {/* Building & Apartment Row - Equal Width Fields */}
        <div className="wizard-row-equal">
          <div className="wizard-field">
            <label htmlFor="buildingId" className="wizard-label">
              Building
              <span className="wizard-label-required">*</span>
            </label>
            {buildingsError && <div className="wizard-error">{buildingsError}</div>}
            <select
              id="buildingId"
              value={selectedBuildingId ? String(selectedBuildingId) : ''}
              onChange={(e) => handleBuildingChange(e.target.value)}
              disabled={buildingsLoading}
            >
              <option value="">Select a building</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name || building.buildingNumber}
                </option>
              ))}
            </select>
          </div>

          <div className="wizard-field">
            <label htmlFor="unitId" className="wizard-label">
              Apartment
              <span className="wizard-label-required">*</span>
            </label>
            <select
              id="unitId"
              value={turnDraft.unitId || ''}
              onChange={(e) => handleApartmentChange(e.target.value)}
              disabled={!selectedBuildingId || apartments.length === 0}
            >
              <option value="">
                {!selectedBuildingId
                  ? 'Select building first'
                  : apartments.length === 0
                    ? 'No apartments available'
                    : 'Select an apartment'}
              </option>
              {apartments.map((apt) => (
                <option key={apt.id} value={apt.id}>
                  Unit {apt.unitNumber}
                  {apt.beds && apt.baths ? ` (${apt.beds}BD/${apt.baths}BA)` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Turn Type & Priority Row - Equal Width Fields */}
        <div className="wizard-row-equal">
          <div className="wizard-field">
            <label htmlFor="turnType" className="wizard-label">
              Turn Type
              <span className="wizard-label-required">*</span>
            </label>
            <select
              id="turnType"
              value={turnDraft.turnType || 'STANDARD_MOVE_OUT'}
              onChange={(e) => onUpdate({ turnType: e.target.value as TurnType })}
            >
              {TURN_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="wizard-field">
            <label htmlFor="priority" className="wizard-label">
              Priority
              <span className="wizard-label-required">*</span>
            </label>
            <select
              id="priority"
              value={turnDraft.priority || 'NORMAL'}
              onChange={(e) => onUpdate({ priority: e.target.value as PriorityLevel })}
            >
              {PRIORITY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Move-Out & Target Ready Date Row - Equal Width Fields */}
        <div className="wizard-row-equal">
          <div className="wizard-field">
            <label htmlFor="moveOutDate" className="wizard-label">
              Move-Out Date
            </label>
            <input
              id="moveOutDate"
              type="date"
              value={turnDraft.moveOutDate ? turnDraft.moveOutDate.split('T')[0] : ''}
              onChange={(e) =>
                onUpdate({
                  moveOutDate: new Date(e.target.value).toISOString(),
                })
              }
            />
          </div>

          <div className="wizard-field">
            <label htmlFor="targetReadyDate" className="wizard-label">
              Target Ready Date
              <span className="wizard-label-required">*</span>
            </label>
            <input
              id="targetReadyDate"
              type="date"
              value={turnDraft.targetReadyDate ? turnDraft.targetReadyDate.split('T')[0] : ''}
              onChange={(e) =>
                onUpdate({
                  targetReadyDate: new Date(e.target.value).toISOString(),
                })
              }
            />
          </div>
        </div>

        {/* Notes - Full Width */}
        <div className="wizard-field wizard-field-full">
          <label htmlFor="turnNotes" className="wizard-label">
            Notes
          </label>
          <textarea
            id="turnNotes"
            placeholder="Add any additional notes about this turn"
            value={turnDraft.turnNotes || ''}
            onChange={(e) => onUpdate({ turnNotes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
