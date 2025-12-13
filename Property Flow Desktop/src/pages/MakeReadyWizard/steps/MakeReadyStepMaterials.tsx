// src/pages/MakeReadyWizard/steps/MakeReadyStepMaterials.tsx
import { useState } from 'react';
import type { MakeReadyTurnDraft, MaterialLine, WorkCategory } from '../../../types/makeReady';

interface Props {
  turnDraft: MakeReadyTurnDraft;
  onUpdate: (updates: Partial<MakeReadyTurnDraft>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLastStep: boolean;
  isSubmitting: boolean;
}

export default function MakeReadyStepMaterials({
  turnDraft,
  onUpdate,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<MaterialLine>>({});

  const handleAddMaterial = () => {
    if (!formData.item || !formData.quantity || !formData.unit) return;

    const material: MaterialLine = {
      id: editingId || `material-${Date.now()}`,
      item: formData.item,
      category: (formData.category as WorkCategory) || 'OTHER',
      quantity: formData.quantity,
      unit: formData.unit,
      costPerUnit: formData.costPerUnit,
      storeOrVendor: formData.storeOrVendor,
    };

    const materials = turnDraft.materials || [];
    const updated = editingId
      ? materials.map((m) => (m.id === editingId ? material : m))
      : [...materials, material];

    onUpdate({ materials: updated });
    setFormData({});
    setShowForm(false);
    setEditingId(null);
  };

  const handleDeleteMaterial = (id: string) => {
    onUpdate({
      materials: (turnDraft.materials || []).filter((m) => m.id !== id),
    });
  };

  const totalMaterialsCost = (turnDraft.materials || []).reduce((sum, m) => {
    return sum + ((m.costPerUnit || 0) * m.quantity);
  }, 0);

  return (
    <div className="wizard-step-content">
      <div className="wizard-section">
        <h3 className="wizard-section-title">Materials List</h3>
        
        {turnDraft.materials && turnDraft.materials.length > 0 ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              {turnDraft.materials.map((material) => (
                <div key={material.id} className="wizard-material-card">
                  <div className="wizard-material-info">
                    <div className="wizard-material-name">{material.item}</div>
                    <div className="wizard-material-quantity">
                      {material.quantity} {material.unit}
                      {material.costPerUnit && ` @ $${material.costPerUnit}/unit`}
                      {material.storeOrVendor && ` (${material.storeOrVendor})`}
                    </div>
                    {material.costPerUnit && (
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                        Subtotal: ${(material.costPerUnit * material.quantity).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="wizard-task-action"
                      style={{ background: '#5b9dd9' }}
                      onClick={() => {
                        setFormData(material);
                        setEditingId(material.id);
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="wizard-task-action"
                      style={{ background: '#ef4444' }}
                      onClick={() => handleDeleteMaterial(material.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {totalMaterialsCost > 0 && (
              <div style={{
                padding: '1rem',
                background: 'rgba(91, 157, 217, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(91, 157, 217, 0.2)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '600' }}>
                    Total Materials Cost
                  </span>
                  <span style={{ color: '#5b9dd9', fontSize: '18px', fontWeight: '700' }}>
                    ${totalMaterialsCost.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>
            No materials added yet
          </p>
        )}
      </div>

      {showForm && (
        <div className="wizard-section" style={{ background: '#232f40', padding: '1.5rem', borderRadius: '8px' }}>
          <h3 className="wizard-section-title">
            {editingId ? 'Edit Material' : 'Add Material'}
          </h3>

          <div className="wizard-field">
            <label htmlFor="materialItem" className="wizard-label">
              Item Name
              <span className="wizard-label-required">*</span>
            </label>
            <input
              id="materialItem"
              type="text"
              value={formData.item || ''}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              placeholder="e.g., Paint (Eggshell, Cream)"
            />
          </div>

          <div className="wizard-inline-grid">
            <div className="wizard-field">
              <label htmlFor="materialQuantity" className="wizard-label">
                Quantity
                <span className="wizard-label-required">*</span>
              </label>
              <input
                id="materialQuantity"
                type="number"
                min="0.1"
                step="0.1"
                value={formData.quantity || ''}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseFloat(e.target.value) })
                }
              />
            </div>

            <div className="wizard-field">
              <label htmlFor="materialUnit" className="wizard-label">
                Unit
                <span className="wizard-label-required">*</span>
              </label>
              <input
                id="materialUnit"
                type="text"
                value={formData.unit || ''}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="gallons, boxes, etc."
              />
            </div>
          </div>

          <div className="wizard-inline-grid">
            <div className="wizard-field">
              <label htmlFor="materialCost" className="wizard-label">
                Cost Per Unit ($)
              </label>
              <input
                id="materialCost"
                type="number"
                min="0"
                step="0.01"
                value={formData.costPerUnit || ''}
                onChange={(e) =>
                  setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) })
                }
              />
            </div>

            <div className="wizard-field">
              <label htmlFor="materialVendor" className="wizard-label">
                Store/Vendor
              </label>
              <input
                id="materialVendor"
                type="text"
                value={formData.storeOrVendor || ''}
                onChange={(e) => setFormData({ ...formData, storeOrVendor: e.target.value })}
                placeholder="Where to purchase this item"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="wizard-btn wizard-btn-primary" onClick={handleAddMaterial}>
              {editingId ? 'Update Material' : 'Add Material'}
            </button>
            <button
              className="wizard-btn wizard-btn-secondary"
              onClick={() => {
                setShowForm(false);
                setFormData({});
                setEditingId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <div className="wizard-section">
          <button
            className="wizard-btn wizard-btn-secondary"
            style={{ width: '100%' }}
            onClick={() => setShowForm(true)}
          >
            + Add Material
          </button>
        </div>
      )}
    </div>
  );
}
