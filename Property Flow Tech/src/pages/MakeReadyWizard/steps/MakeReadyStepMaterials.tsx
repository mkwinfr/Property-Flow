// src/pages/MakeReadyWizard/steps/MakeReadyStepMaterials.tsx
import { useState } from 'react';
import type { MakeReadyTurnDraft, MaterialLine, WorkCategory } from '@/types/makeReady';

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
  onNext,
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
      <div className="materials-list">
        {turnDraft.materials && turnDraft.materials.length > 0 ? (
          <>
            <div className="materials-items">
              {turnDraft.materials.map((material) => (
                <div key={material.id} className="material-item">
                  <div className="material-info">
                    <h4>{material.item}</h4>
                    <p className="material-meta">
                      {material.quantity} {material.unit}
                      {material.costPerUnit && ` @ $${material.costPerUnit}/unit`}
                      {material.storeOrVendor && ` (${material.storeOrVendor})`}
                    </p>
                    {material.costPerUnit && (
                      <p className="material-cost">
                        Subtotal: $
                        {(material.costPerUnit * material.quantity).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="material-actions">
                    <button
                      className="material-btn material-btn-edit"
                      onClick={() => {
                        setFormData(material);
                        setEditingId(material.id);
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="material-btn material-btn-delete"
                      onClick={() => handleDeleteMaterial(material.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="materials-total">
              <strong>Total Materials Cost:</strong>
              <span>${totalMaterialsCost.toFixed(2)}</span>
            </div>
          </>
        ) : (
          <p className="empty-state">No materials added yet</p>
        )}
      </div>

      {showForm && (
        <div className="material-form">
          <h3>{editingId ? 'Edit Material' : 'Add Material'}</h3>
          <div className="form-group">
            <label htmlFor="materialItem">Item Name *</label>
            <input
              id="materialItem"
              type="text"
              value={formData.item || ''}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              className="form-input"
              placeholder="e.g., Paint (Eggshell, Cream)"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="materialQuantity">Quantity *</label>
              <input
                id="materialQuantity"
                type="number"
                min="0.1"
                step="0.1"
                value={formData.quantity || ''}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseFloat(e.target.value) })
                }
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="materialUnit">Unit *</label>
              <input
                id="materialUnit"
                type="text"
                value={formData.unit || ''}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="form-input"
                placeholder="gallons, boxes, etc."
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="materialCost">Cost Per Unit ($)</label>
            <input
              id="materialCost"
              type="number"
              min="0"
              step="0.01"
              value={formData.costPerUnit || ''}
              onChange={(e) =>
                setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) })
              }
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="materialVendor">Store/Vendor</label>
            <input
              id="materialVendor"
              type="text"
              value={formData.storeOrVendor || ''}
              onChange={(e) => setFormData({ ...formData, storeOrVendor: e.target.value })}
              className="form-input"
              placeholder="Where to purchase this item"
            />
          </div>

          <div className="form-actions">
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
        <button
          className="wizard-btn wizard-btn-secondary wizard-btn-block"
          onClick={() => setShowForm(true)}
        >
          + Add Material
        </button>
      )}

      <button className="wizard-btn wizard-btn-primary" onClick={onNext}>
        Continue
      </button>
    </div>
  );
}
