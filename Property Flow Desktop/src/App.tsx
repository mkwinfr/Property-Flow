import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MakeReadyBoardProvider } from './hooks/useMakeReadyBoard';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Login from './pages/Login/Login';

// Dashboard pages
import DashboardOverview from './pages/Dashboard/Overview';
import DashboardTasks from './pages/Dashboard/Tasks';
import DashboardAlerts from './pages/Dashboard/Alerts';
import DashboardActivity from './pages/Dashboard/Activity';

// Management pages
import ManagementProperties from './pages/Management/Properties';
import ManagementApartments from './pages/Management/Apartments';
import ManagementResidents from './pages/Management/Residents';
import ManagementVendors from './pages/Management/Vendors';
import ManagementPortfolios from './pages/Management/Portfolios';

// Maintenance pages
import MaintenanceMakeReady from './pages/Maintenance/MakeReady';
import MaintenanceMakeReadyWizard from './pages/Maintenance/MakeReadyWizard';
import MaintenanceWorkOrders from './pages/Maintenance/WorkOrders';
import MaintenanceTasks from './pages/Maintenance/Tasks';
import MaintenanceInspections from './pages/Maintenance/Inspections';
import MaintenanceSchedule from './pages/Maintenance/Schedule';
import MaintenanceVendors from './pages/Maintenance/Vendors';
import MaintenanceCosts from './pages/Maintenance/Costs';

// Leasing pages
import LeasingAvailability from './pages/Leasing/Availability';
import LeasingApplications from './pages/Leasing/Applications';
import LeasingLeases from './pages/Leasing/Leases';
import LeasingShowings from './pages/Leasing/Showings';
import LeasingMarketing from './pages/Leasing/Marketing';

// Administration pages
import AdminUsers from './pages/Admin/Users';
import AdminTemplates from './pages/Admin/Templates';
import AdminCategories from './pages/Admin/Categories';
import AdminVendorRates from './pages/Admin/VendorRates';
import AdminNotifications from './pages/Admin/Notifications';
import AdminIntegrations from './pages/Admin/Integrations';
import AdminAudit from './pages/Admin/Audit';
import AdminSettings from './pages/Admin/Settings';

function App() {
  return (
    <AuthProvider>
      <MakeReadyBoardProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
        
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Dashboard routes */}
            <Route path="/dashboard" element={<DashboardOverview />} />
            <Route path="/dashboard/tasks" element={<DashboardTasks />} />
            <Route path="/dashboard/alerts" element={<DashboardAlerts />} />
            <Route path="/dashboard/activity" element={<DashboardActivity />} />
            
            {/* Management routes */}
            <Route path="/management/properties" element={<ManagementProperties />} />
            <Route path="/management/apartments" element={<ManagementApartments />} />
            <Route path="/management/residents" element={<ManagementResidents />} />
            <Route path="/management/vendors" element={<ManagementVendors />} />
            <Route path="/management/portfolios" element={<ManagementPortfolios />} />
            
            {/* Maintenance routes */}
            <Route path="/maintenance/make-ready" element={<MaintenanceMakeReady />} />
            <Route path="/maintenance/make-ready-wizard" element={<MaintenanceMakeReadyWizard />} />
            <Route path="/maintenance/work-orders" element={<MaintenanceWorkOrders />} />
            <Route path="/maintenance/tasks" element={<MaintenanceTasks />} />
            <Route path="/maintenance/inspections" element={<MaintenanceInspections />} />
            <Route path="/maintenance/schedule" element={<MaintenanceSchedule />} />
            <Route path="/maintenance/vendors" element={<MaintenanceVendors />} />
            <Route path="/maintenance/costs" element={<MaintenanceCosts />} />
            
            {/* Leasing routes */}
            <Route path="/leasing/availability" element={<LeasingAvailability />} />
            <Route path="/leasing/applications" element={<LeasingApplications />} />
            <Route path="/leasing/leases" element={<LeasingLeases />} />
            <Route path="/leasing/showings" element={<LeasingShowings />} />
            <Route path="/leasing/marketing" element={<LeasingMarketing />} />
            
            {/* Administration routes */}
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/templates" element={<AdminTemplates />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/vendor-rates" element={<AdminVendorRates />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
            <Route path="/admin/integrations" element={<AdminIntegrations />} />
            <Route path="/admin/audit" element={<AdminAudit />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>
        </Routes>
      </MakeReadyBoardProvider>
    </AuthProvider>
  );
}

export default App;
