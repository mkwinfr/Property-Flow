// src/pages/MoveoutInspectionWizard/steps/MoveoutInspectionStepStart.tsx
import React, { useState, useEffect } from 'react';
import type { MoveoutInspectionWizardState, MoveoutInspectionDraft } from '@/types/moveoutInspection';
import { apiUrl } from '@/config/api';

interface Props {
  wizardState: MoveoutInspectionWizardState;
  onDraftUpdate: (updates: Partial<MoveoutInspectionDraft>) => void;
  onNext: () => void;
  isSubmitting: boolean;
}

interface Property {
  id: number;
  name: string;
  code?: string;
}

interface Apartment {
  id: number;
  unitNumber: string;
  building?: string;
}

const MoveoutInspectionStepStart: React.FC<Props> = ({
  wizardState,
  onDraftUpdate,
  onNext,
  isSubmitting,
}) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingApartments, setLoadingApartments] = useState(false);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetch(apiUrl('/api/properties'));
        if (response.ok) {
          const data = await response.json();
          setProperties(Array.isArray(data) ? data : data.properties || []);
        }
      } catch (err) {
        console.error('Failed to fetch properties', err);
      } finally {
        setLoadingProperties(false);
      }
    };

    fetchProperties();
  }, []);

  useEffect(() => {
    const fetchApartments = async () => {
      if (!wizardState.inspectionDraft.propertyId) {
        setApartments([]);
        return;
      }

      setLoadingApartments(true);
      try {
        const response = await fetch(
          apiUrl(`/api/apartments?propertyId=${wizardState.inspectionDraft.propertyId}`)
        );
        if (response.ok) {
          const data = await response.json();
          setApartments(Array.isArray(data) ? data : data.apartments || []);
        }
      } catch (err) {
        console.error('Failed to fetch apartments', err);
      } finally {
        setLoadingApartments(false);
      }
    };

    fetchApartments();
  }, [wizardState.inspectionDraft.propertyId]);

  const canProceed =
    wizardState.inspectionDraft.propertyId &&
    wizardState.inspectionDraft.apartmentId &&
    wizardState.inspectionDraft.inspectionType &&
    wizardState.inspectionDraft.inspectionDate;

  return (
    <div className="wizard-step-start">
      <form className="form">
        <div className="form-group">
          <label className="form-label">Property *</label>
          <select
            className="form-input"
            value={wizardState.inspectionDraft.propertyId || ''}
            onChange={(e) => onDraftUpdate({ propertyId: Number(e.target.value) })}
            disabled={loadingProperties || isSubmitting}
          >
            <option value="">Select a property...</option>
            {properties.map((prop) => (
              <option key={prop.id} value={prop.id}>
                {prop.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Unit *</label>
          <select
            className="form-input"
            value={wizardState.inspectionDraft.apartmentId || ''}
            onChange={(e) => onDraftUpdate({ apartmentId: Number(e.target.value) })}
            disabled={loadingApartments || isSubmitting || !wizardState.inspectionDraft.propertyId}
          >
            <option value="">Select a unit...</option>
            {apartments.map((apt) => (
              <option key={apt.id} value={apt.id}>
                {apt.building} {apt.unitNumber}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Inspection Type *</label>
          <select
            className="form-input"
            value={wizardState.inspectionDraft.inspectionType || 'FINAL'}
            onChange={(e) => onDraftUpdate({ inspectionType: e.target.value as any })}
            disabled={isSubmitting}
          >
            <option value="PRE_MOVEOUT">Pre-Moveout</option>
            <option value="FINAL">Final Inspection</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Inspection Date *</label>
          <input
            type="date"
            className="form-input"
            value={wizardState.inspectionDraft.inspectionDate || ''}
            onChange={(e) => onDraftUpdate({ inspectionDate: e.target.value })}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Inspector (Default: You)</label>
          <input
            type="text"
            className="form-input"
            placeholder="Current user"
            disabled
            value="Current User"
          />
        </div>

        <div className="form-group">
          <label className="form-label">General Notes</label>
          <textarea
            className="form-input form-textarea"
            placeholder="Any initial observations or special conditions..."
            value={wizardState.inspectionDraft.notes || ''}
            onChange={(e) => onDraftUpdate({ notes: e.target.value })}
            disabled={isSubmitting}
            rows={4}
          />
        </div>

        <div className="wizard-actions">
          <button
            className="btn btn-primary"
            onClick={onNext}
            disabled={!canProceed || isSubmitting}
            type="button"
          >
            Next →
          </button>
        </div>
      </form>
    </div>
  );
};

export default MoveoutInspectionStepStart;
