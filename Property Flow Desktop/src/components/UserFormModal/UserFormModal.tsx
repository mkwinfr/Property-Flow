import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './UserFormModal.css';

interface User {
  id: number;
  name: string;
  email: string;
  userRole: string;
  roleId?: number | null;
  role?: Role | null;
  status: string;
  properties?: Array<{ property: { id: number; name: string; code: string } }>;
}

interface Role {
  id: number;
  name: string;
  key: string;
  department: { id: number; name: string };
}

interface UserFormModalProps {
  user: User | null;
  onSave: (data: {
    name: string;
    email?: string;
    userRole?: string;
    roleId?: number | null;
    status?: string;
    propertyIds?: number[];
  }) => Promise<void>;
  onClose: () => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  user,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    roleId: user?.roleId ?? user?.role?.id ?? null,
    userRole: user?.role?.key || user?.userRole || '',
    status: user?.status || 'ACTIVE',
    propertyIds: user?.properties?.map((p) => p.property.id) || [],
  });

  const [properties, setProperties] = useState<
    Array<{ id: number; name: string; code: string }>
  >([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProperties();
    fetchRoles();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:4000/api/properties', {
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

  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:4000/api/admin/roles', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }

      const data = await response.json();
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch roles');
      // Fallback to empty roles if fetch fails
      setRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const id = value ? parseInt(value, 10) : null;
    const role = roles.find((r) => r.id === id);
    setFormData((prev) => ({
      ...prev,
      roleId: id,
      userRole: role?.key || prev.userRole,
    }));
  };

  const handlePropertyToggle = (propertyId: number) => {
    setFormData((prev) => {
      const propertyIds = prev.propertyIds.includes(propertyId)
        ? prev.propertyIds.filter((id) => id !== propertyId)
        : [...prev.propertyIds, propertyId];
      return {
        ...prev,
        propertyIds,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (
      !user &&
      !formData.email.trim()
    ) {
      setError('Email is required');
      return;
    }

    if (
      !user &&
      !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    ) {
      setError('Please enter a valid email');
      return;
    }

    try {
      setSaving(true);
      if (roles.length > 0 && !formData.roleId) {
        setError('Please select a role');
        setSaving(false);
        return;
      }
      const submitData = user
        ? {
            name: formData.name,
            roleId: formData.roleId ?? undefined,
            userRole: formData.userRole || undefined,
            status: formData.status,
            propertyIds: formData.propertyIds,
          }
        : {
            name: formData.name,
            email: formData.email,
            roleId: formData.roleId ?? undefined,
            userRole: formData.userRole || undefined,
            propertyIds: formData.propertyIds,
          };

      await onSave(submitData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{user ? 'Edit User' : 'Create New User'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="user-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="John Doe"
              required
            />
          </div>

          {!user && (
            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="john@example.com"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="userRole">Role *</label>
            {loadingRoles ? (
              <p className="loading-text">Loading roles...</p>
            ) : roles.length === 0 ? (
              <select
                id="userRole"
                name="userRole"
                value={formData.userRole}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, userRole: e.target.value }))
                }
                required
              >
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="PROPERTY_MANAGER">Property Manager</option>
                <option value="MAINTENANCE_TEAM">Maintenance Team</option>
                <option value="VENDOR">Vendor</option>
                <option value="VIEWER">Viewer</option>
              </select>
            ) : (
              <select
                id="userRole"
                name="userRole"
                value={formData.roleId ?? ''}
                onChange={handleRoleChange}
                required
              >
                <option value="">Select a role...</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} ({role.department.name})
                  </option>
                ))}
              </select>
            )}
          </div>

          {user && (
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Assign Properties</label>
            {loadingProperties ? (
              <p className="loading-text">Loading properties...</p>
            ) : properties.length === 0 ? (
              <p className="empty-text">No properties available</p>
            ) : (
              <div className="checkbox-group">
                {properties.map((property) => (
                  <label key={property.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.propertyIds.includes(property.id)}
                      onChange={() => handlePropertyToggle(property.id)}
                    />
                    <span>
                      {property.name}
                      <small>{property.code}</small>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

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
              {saving ? 'Saving...' : user ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
