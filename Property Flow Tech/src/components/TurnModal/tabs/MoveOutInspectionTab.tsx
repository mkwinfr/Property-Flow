import React, { useState } from 'react';
import type { Turn } from '@/types/turn-management';
import { apiUrl } from '@/config/api';
import './MoveOutInspectionTab.css';

interface MoveOutInspectionTabProps {
  turn: Turn;
  onTurnUpdate?: (updatedTurn: Turn) => void;
}

interface ApplianceUpdate {
  name: string;
  status: 'working' | 'needs-repair' | 'needs-replacement';
  notes: string;
}

const MoveOutInspectionTab: React.FC<MoveOutInspectionTabProps> = ({ turn, onTurnUpdate }) => {
  const [appliances, setAppliances] = useState<ApplianceUpdate[]>(
    turn.appliances?.map((a: any) => ({
      name: a.name,
      status: a.status || 'working',
      notes: a.notes || '',
    })) || [
      { name: 'Refrigerator', status: 'working', notes: '' },
      { name: 'Stove/Oven', status: 'working', notes: '' },
      { name: 'Dishwasher', status: 'working', notes: '' },
      { name: 'Microwave', status: 'working', notes: '' },
    ]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApplianceChange = (index: number, field: keyof ApplianceUpdate, value: any) => {
    const updated = [...appliances];
    updated[index] = { ...updated[index], [field]: value };
    setAppliances(updated);
  };

  const handleSaveAppliances = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch(apiUrl(`/api/turns/${turn.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appliances }),
      });
      if (!res.ok) throw new Error('Failed to save appliances');
      const updatedTurn = await res.json();
      onTurnUpdate?.(updatedTurn);
      window.dispatchEvent(new CustomEvent('turn-updated', { detail: { turn: updatedTurn } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving appliances');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="move-out-tab">
      <div className="inspection-section">
        <h3>Unit Condition Assessment</h3>
        
        <div className="inspection-grid">
          <div className="inspection-item">
            <label>Overall Condition</label>
            <span className="value">{turn.overallCondition || 'Not assessed'}</span>
          </div>
          
          <div className="inspection-item">
            <label>Walls</label>
            <span className="value">{turn.wallsCondition || 'Not assessed'}</span>
          </div>
          
          <div className="inspection-item">
            <label>Flooring</label>
            <span className="value">{turn.flooringCondition || 'Not assessed'}</span>
          </div>
          
          <div className="inspection-item">
            <label>Doors & Locks</label>
            <span className="value">{turn.doorsLocksCondition || 'Not assessed'}</span>
          </div>

          <div className="inspection-item">
            <label>Plumbing</label>
            <span className="value">{turn.plumbingCondition || 'Not assessed'}</span>
          </div>

          <div className="inspection-item">
            <label>Electrical</label>
            <span className="value">{turn.electricalCondition || 'Not assessed'}</span>
          </div>

          <div className="inspection-item">
            <label>Appliances</label>
            <span className="value">{turn.appliancesCondition || 'Not assessed'}</span>
          </div>

          <div className="inspection-item">
            <label>Cleanliness</label>
            <span className="value">{turn.cleanlinessCondition || 'Not assessed'}</span>
          </div>
        </div>

        {turn.hasLifeSafetyIssues && (
          <div className="safety-alert">
            <strong>⚠️ Safety Issues Found</strong>
            <p>{turn.lifeSafetyNotes}</p>
          </div>
        )}
      </div>

      {turn.notes && (
        <div className="notes-section">
          <h3>Notes</h3>
          <p>{turn.notes}</p>
        </div>
      )}

      <div className="appliances-section">
        <h3>Appliance Status</h3>
        {error && <div className="error-message">{error}</div>}
        
        <div className="appliances-list">
          {appliances.map((appliance, idx) => (
            <div key={idx} className="appliance-item">
              <div className="appliance-header">
                <label>{appliance.name}</label>
                <select
                  value={appliance.status}
                  onChange={(e) => handleApplianceChange(idx, 'status', e.target.value)}
                  className="status-select"
                >
                  <option value="working">✓ Working</option>
                  <option value="needs-repair">🔧 Needs Repair</option>
                  <option value="needs-replacement">✗ Needs Replacement</option>
                </select>
              </div>
              <textarea
                value={appliance.notes}
                onChange={(e) => handleApplianceChange(idx, 'notes', e.target.value)}
                placeholder="Add notes about this appliance..."
                className="appliance-notes"
                rows={2}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSaveAppliances}
          disabled={saving}
          className="save-btn"
        >
          {saving ? 'Saving...' : 'Save Appliance Updates'}
        </button>
      </div>
    </div>
  );
};

export default MoveOutInspectionTab;
