import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

interface NavItem {
  label: string;
  path: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    label: 'Dashboard',
    items: [
      { label: 'Overview', path: '/dashboard' },
      { label: 'My Tasks', path: '/dashboard/tasks' },
      { label: 'Alerts & Issues', path: '/dashboard/alerts' },
      { label: 'Activity Feed', path: '/dashboard/activity' },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Properties', path: '/management/properties' },
      { label: 'Apartments', path: '/management/apartments' },
      { label: 'Residents / Tenants', path: '/management/residents' },
      { label: 'Vendors', path: '/management/vendors' },
      { label: 'Owners / Portfolios', path: '/management/portfolios' },
    ],
  },
  {
    label: 'Maintenance',
    items: [
      { label: 'Make Ready Board', path: '/maintenance/make-ready' },
      { label: 'Make Ready Wizard', path: '/maintenance/make-ready-wizard' },
      { label: 'Work Orders', path: '/maintenance/work-orders' },
      { label: 'Tasks', path: '/maintenance/tasks' },
      { label: 'Inspections', path: '/maintenance/inspections' },
      { label: 'Schedule', path: '/maintenance/schedule' },
      { label: 'Vendors', path: '/maintenance/vendors' },
      { label: 'Costs & Estimates', path: '/maintenance/costs' },
    ],
  },
  {
    label: 'Leasing',
    items: [
      { label: 'Availability', path: '/leasing/availability' },
      { label: 'Applications', path: '/leasing/applications' },
      { label: 'Leases', path: '/leasing/leases' },
      { label: 'Showings', path: '/leasing/showings' },
      { label: 'Marketing', path: '/leasing/marketing' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Users & Roles', path: '/admin/users' },
      { label: 'Templates', path: '/admin/templates' },
      { label: 'Categories & Tags', path: '/admin/categories' },
      { label: 'Vendors & Rates', path: '/admin/vendor-rates' },
      { label: 'Notifications', path: '/admin/notifications' },
      { label: 'Integrations', path: '/admin/integrations' },
      { label: 'Audit Log', path: '/admin/audit' },
      { label: 'System Settings', path: '/admin/settings' },
    ],
  },
];

const Sidebar = () => {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const { logout, user } = useAuth();

  const toggleSection = (label: string) => {
    setExpandedSections((prev) =>
      prev.includes(label)
        ? prev.filter((s) => s !== label)
        : [...prev, label]
    );
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-brand">Property Suite</h1>
        {user && <p className="sidebar-user">{user.name}</p>}
      </div>

      <nav className="sidebar-nav">
        {navigationSections.map((section) => {
          const isExpanded = expandedSections.includes(section.label);
          return (
            <div key={section.label} className="sidebar-section">
              <button
                className="sidebar-section-header"
                onClick={() => toggleSection(section.label)}
              >
                <span>{section.label}</span>
                <span className={`sidebar-chevron ${isExpanded ? 'expanded' : ''}`}>
                  ▼
                </span>
              </button>
              {isExpanded && (
                <div className="sidebar-section-items">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `sidebar-link ${isActive ? 'active' : ''}`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={logout}>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
