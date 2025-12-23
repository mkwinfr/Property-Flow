import React, { useState, useMemo } from 'react';
import type { Turn } from '@/types/turn-management';
import './VendorServicesTab.css';

interface VendorServicesTabProps {
  turn: Turn;
}

export interface VendorService {
  id: string;
  category: 'flooring' | 'painters' | 'cleaner' | 'resurfacing';
  vendorName: string;
  scheduledDate: string | null;
  status: 'not-scheduled' | 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  cost?: number;
}

const VENDOR_CATEGORIES = [
  { id: 'flooring', label: 'Flooring', icon: '🏗️' },
  { id: 'painters', label: 'Painters', icon: '🎨' },
  { id: 'cleaner', label: 'Cleaning', icon: '🧹' },
  { id: 'resurfacing', label: 'Resurfacing', icon: '✨' },
];

// Mock vendor data - will be replaced with API call
const MOCK_VENDORS = {
  flooring: ['Floor Pro', 'Hardwood Specialists', 'Carpet Masters'],
  painters: ['Premium Paints Co', 'Color Perfect', 'Interior Artisans'],
  cleaner: ['Clean Sweep', 'Professional Cleaners', 'Spotless Services'],
  resurfacing: ['Bath Refinish', 'Surface Experts', 'Finish Line'],
};

const VendorServicesTab: React.FC<VendorServicesTabProps> = ({ turn }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('flooring');
  const [vendorServices, setVendorServices] = useState<VendorService[]>([]);
  const [editingService, setEditingService] = useState<VendorService | null>(null);

  // Get vendors for selected category
  const availableVendors = useMemo(() => {
    return MOCK_VENDORS[selectedCategory as keyof typeof MOCK_VENDORS] || [];
  }, [selectedCategory]);

  // Get services for selected category
  const categoryServices = useMemo(() => {
    return vendorServices.filter(s => s.category === selectedCategory);
  }, [vendorServices, selectedCategory]);

  // Handle add new service
  const handleAddService = () => {
    const newService: VendorService = {
      id: `vendor-${Date.now()}`,
      category: selectedCategory as any,
      vendorName: '',
      scheduledDate: null,
      status: 'not-scheduled',
      notes: '',
      cost: 0,
    };
    setEditingService(newService);
  };

  // Handle save service
  const handleSaveService = () => {
    if (!editingService || !editingService.vendorName) {
      alert('Please select a vendor');
      return;
    }

    if (vendorServices.find(s => s.id === editingService.id)) {
      // Update existing
      setVendorServices(prev => prev.map(s => s.id === editingService.id ? editingService : s));
    } else {
      // Add new
      setVendorServices(prev => [...prev, editingService]);
    }

    setEditingService(null);
  };

  // Handle delete service
  const handleDeleteService = (id: string) => {
    setVendorServices(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="vendor-services-tab">
      <div className="vendor-sidebar">
        <h4 className="vendor-sidebar-title">Vendor Services</h4>
        <div className="vendor-categories">
          {VENDOR_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`vendor-category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span className="vendor-icon">{cat.icon}</span>
              <span className="vendor-label">{cat.label}</span>
              <span className="vendor-count">{vendorServices.filter(s => s.category === cat.id).length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="vendor-content">
        {/* Header */}
        <div className="vendor-header">
          <h3>{VENDOR_CATEGORIES.find(c => c.id === selectedCategory)?.label} Services</h3>
          <button className="add-vendor-btn" onClick={handleAddService}>
            + Add Service
          </button>
        </div>

        {/* Services List */}
        <div className="vendor-services-list">
          {categoryServices.length === 0 ? (
            <div className="empty-state">
              <p>No {VENDOR_CATEGORIES.find(c => c.id === selectedCategory)?.label.toLowerCase()} services scheduled</p>
            </div>
          ) : (
            categoryServices.map(service => (
              <div key={service.id} className="vendor-service-card">
                <div className="service-header">
                  <h4>{service.vendorName}</h4>
                  <span className={`service-status ${service.status}`}>{service.status.replace('-', ' ')}</span>
                </div>
                <div className="service-details">
                  {service.scheduledDate && (
                    <div className="detail-row">
                      <span className="label">📅 Scheduled:</span>
                      <span className="value">{new Date(service.scheduledDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {service.cost && (
                    <div className="detail-row">
                      <span className="label">💰 Cost:</span>
                      <span className="value">${service.cost.toFixed(2)}</span>
                    </div>
                  )}
                  {service.notes && (
                    <div className="detail-row">
                      <span className="label">📝 Notes:</span>
                      <span className="value">{service.notes}</span>
                    </div>
                  )}
                </div>
                <div className="service-actions">
                  <button className="edit-btn" onClick={() => setEditingService(service)}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDeleteService(service.id)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingService && (
        <div className="vendor-modal-overlay" onClick={() => setEditingService(null)}>
          <div className="vendor-modal" onClick={e => e.stopPropagation()}>
            <h3>Edit {VENDOR_CATEGORIES.find(c => c.id === selectedCategory)?.label}</h3>

            <div className="form-group">
              <label>Select Vendor</label>
              <select
                value={editingService.vendorName}
                onChange={e => setEditingService({ ...editingService, vendorName: e.target.value })}
                className="vendor-select"
              >
                <option value="">Choose a vendor...</option>
                {availableVendors.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Schedule Date</label>
              <input
                type="date"
                value={editingService.scheduledDate || ''}
                onChange={e => setEditingService({
                  ...editingService,
                  scheduledDate: e.target.value,
                  status: e.target.value ? 'scheduled' : 'not-scheduled',
                })}
                className="date-input"
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={editingService.status}
                onChange={e => setEditingService({ ...editingService, status: e.target.value as any })}
                className="status-select"
              >
                <option value="not-scheduled">Not Scheduled</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="form-group">
              <label>Cost (Optional)</label>
              <input
                type="number"
                value={editingService.cost || ''}
                onChange={e => setEditingService({ ...editingService, cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="0.00"
                className="cost-input"
              />
            </div>

            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea
                value={editingService.notes || ''}
                onChange={e => setEditingService({ ...editingService, notes: e.target.value })}
                placeholder="Any notes about this service..."
                className="notes-textarea"
              />
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setEditingService(null)}>Cancel</button>
              <button className="save-btn" onClick={handleSaveService}>Save Service</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorServicesTab;
