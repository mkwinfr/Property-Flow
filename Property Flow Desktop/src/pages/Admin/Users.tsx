import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, RotateCcw, Users } from 'lucide-react';
import './Users.css';
import UserFormModal from '../../components/UserFormModal/UserFormModal';
import PermissionsModal from '../../components/PermissionsModal/PermissionsModal';
import { apiUrl } from '../../config/api';

class ModalErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error('Modal render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="modal-overlay" onClick={this.props.onClose}>
          <div
            className="modal-content"
            style={{ padding: '1.5rem', maxWidth: 500, color: '#111' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Something went wrong loading this dialog.</h3>
            <p>Please close and try again.</p>
            <button className="btn btn-primary" type="button" onClick={this.props.onClose}>
              Close
            </button>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

interface Role {
  id: number;
  key: string;
  name: string;
  department: { id: number; name: string };
}

interface User {
  id: number;
  name: string;
  email: string;
  userRole: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  roleId: number | null;
  role?: Role | null;
  properties?: Array<{ property: { id: number; name: string; code: string } }>;
}

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      const response = await fetch(apiUrl('/api/admin/users'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (formData: {
    name: string;
    email?: string;
    userRole?: string;
    roleId?: number | null;
    status?: string;
    propertyIds?: number[];
  }) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(apiUrl('/api/admin/users'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      await fetchUsers();
      setShowUserModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleEditUser = async (formData: {
    name?: string;
    userRole?: string;
    roleId?: number | null;
    status?: string;
    propertyIds?: number[];
  }) => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        apiUrl(`/api/admin/users/${selectedUser.id}`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      await fetchUsers();
      setShowUserModal(false);
      setSelectedUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDeactivateUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        apiUrl(`/api/admin/users/${userId}`),
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to deactivate user');
      }

      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate user');
    }
  };

  const handleResetPassword = async (userId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        apiUrl(`/api/admin/users/${userId}/reset-password`),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reset password');
      }

      const data = await response.json();
      alert(`Temporary password: ${data.temporaryPassword}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  const filteredUsers = users.filter((user) => {
    const roleMatch = filterRole === 'all' || user.userRole === filterRole;
    const statusMatch = filterStatus === 'all' || user.status === filterStatus;
    return roleMatch && statusMatch;
  });

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      SUPER_ADMIN: 'role-super-admin',
      PROPERTY_MANAGER: 'role-manager',
      MAINTENANCE_TEAM: 'role-maintenance',
      VENDOR: 'role-vendor',
      VIEWER: 'role-viewer',
    };
    return colors[role] || 'role-default';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      ACTIVE: 'status-active',
      INACTIVE: 'status-inactive',
      SUSPENDED: 'status-suspended',
    };
    return colors[status] || 'status-default';
  };

  return (
    <div className="admin-page users-page">
      <div className="page-header">
        <h1>Users & Roles</h1>
        <p>Manage user accounts and permissions</p>
      </div>

      <div className="page-content">
        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <div className="users-subnav">
          <button
            className={activeTab === 'users' ? 'subnav-btn active' : 'subnav-btn'}
            type="button"
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            className={activeTab === 'roles' ? 'subnav-btn active' : 'subnav-btn'}
            type="button"
            onClick={() => setActiveTab('roles')}
          >
            Role Permissions
          </button>
        </div>

        {activeTab === 'users' && (
        <div className="admin-toolbar">
          <div className="admin-filters">
            <select
              className="filter-select"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="PROPERTY_MANAGER">Property Manager</option>
              <option value="MAINTENANCE_TEAM">Maintenance Team</option>
              <option value="VENDOR">Vendor</option>
              <option value="VIEWER">Viewer</option>
            </select>

            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              setSelectedUser(null);
              setShowUserModal(true);
            }}
          >
            <Plus size={18} />
            Create User
          </button>
        </div>
        )}

        {activeTab === 'users' && (loading ? (
          <div className="loading-state">
            <p>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>No users found</h3>
            <p>
              {filterRole !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first user to get started'}
            </p>
          </div>
        ) : (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Properties</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="user-name">{user.name}</td>
                    <td className="user-email">{user.email}</td>
                    <td>
                      <span className={`badge role ${getRoleColor(user.userRole)}`}>
                        {user.userRole.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge status ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="last-login">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="properties-count">
                      {user.properties?.length || 0} property(ies)
                    </td>
                    <td className="actions-cell">
                      <button
                        className="action-btn edit-btn"
                        type="button"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                        }}
                        title="Edit user"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="action-btn permissions-btn"
                        type="button"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowPermissionsModal(true);
                        }}
                        title="Manage permissions"
                      >
                        <Users size={16} />
                      </button>
                      <button
                        className="action-btn reset-btn"
                        type="button"
                        onClick={() => handleResetPassword(user.id)}
                        title="Reset password"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button
                        className="action-btn delete-btn"
                        type="button"
                        onClick={() => handleDeactivateUser(user.id)}
                        title="Deactivate user"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {activeTab === 'roles' && (
          <div className="roles-panel">
            <h3>Role permissions</h3>
            <p>
              Manage role-level permissions from the Roles view. Use the button below to open the
              roles page and edit permissions for each role.
            </p>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => navigate('/admin/roles')}
            >
              Go to Roles & Permissions
            </button>
          </div>
        )}
      </div>

      {showUserModal && (
        <ModalErrorBoundary
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
        >
          <UserFormModal
            user={selectedUser}
            onSave={selectedUser ? handleEditUser : handleCreateUser}
            onClose={() => {
              setShowUserModal(false);
              setSelectedUser(null);
            }}
          />
        </ModalErrorBoundary>
      )}

      {showPermissionsModal && selectedUser && (
        <ModalErrorBoundary
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedUser(null);
          }}
        >
          <PermissionsModal
            user={selectedUser}
            onClose={() => {
              setShowPermissionsModal(false);
              setSelectedUser(null);
            }}
            onSave={async (data) => {
              await handleEditUser({
                propertyIds: data.propertyIds,
              });
              setShowPermissionsModal(false);
              setSelectedUser(null);
            }}
          />
        </ModalErrorBoundary>
      )}
    </div>
  );
};

export default AdminUsers;
