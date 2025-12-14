import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiUrl } from '../../config/api';
import './PermissionsModal.css';

interface User {
  id: number;
  name: string;
  email: string;
  userRole: string;
  properties?: Array<{ property: { id: number; name: string; code: string } }>;
}

interface PermissionsModalProps {
  user: User;
  onClose: () => void;
  onSave: (data: { propertyIds: number[] }) => Promise<void>;
}

const PermissionsModal: React.FC<PermissionsModalProps> = ({
  user,
  onClose,
  onSave,
}) => {
  const [properties, setProperties] = useState<
    Array<{ id: number; name: string; code: string }>
  >([]);
  const [selectedProperties, setSelectedProperties] = useState<number[]>(
    user.properties?.map((p) => p.property.id) || []
  );
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(apiUrl('/api/properties'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch properties');
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      const safeProperties = list
        .map((p: any) => ({
          id: p?.id,
          name: p?.name,
          code: p?.code,
        }))
        .filter((p) => p.id && p.name) as Array<{ id: number; name: string; code: string }>;

      setProperties(safeProperties);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch properties');
    } finally {
      setLoadingProperties(false);
    }
  };

  const handlePropertyToggle = (propertyId: number) => {
    setSelectedProperties((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProperties.length === properties.length) {
      setSelectedProperties([]);
    } else {
      setSelectedProperties(properties.map((p) => p.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSave({ propertyIds: selectedProperties });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSaving(false);
    }
  };

  const allSelected = selectedProperties.length === properties.length;
  const someSelected = selectedProperties.length > 0 && !allSelected;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content permissions-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Property Access</h2>
            <p className="modal-subtitle">
              {user.name} ({user.userRole.replace(/_/g, ' ')})
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="permissions-form">
          {error && <div className="form-error">{error}</div>}

          <div className="permissions-info">
            <p>Select which properties this user can access and manage:</p>
          </div>

          {loadingProperties ? (
            <div className="loading-text">Loading properties...</div>
          ) : properties.length === 0 ? (
            <div className="empty-text">No properties available</div>
          ) : (
            <div className="permissions-section">
              <div className="select-all-option">
                <label className="checkbox-label select-all">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={handleSelectAll}
                  />
                  <span>
                    <strong>Select All Properties</strong>
                    <small>
                      {selectedProperties.length} of {properties.length} selected
                    </small>
                  </span>
                </label>
              </div>

              <div className="properties-grid">
                {properties.map((property) => (
                  <label key={property.id} className="checkbox-label property-item">
                    <input
                      type="checkbox"
                      checked={selectedProperties.includes(property.id)}
                      onChange={() => handlePropertyToggle(property.id)}
                    />
                    <span>
                      <strong>{property.name}</strong>
                      <small>{property.code}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PermissionsModal;
