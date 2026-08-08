import { useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { PortalAuthProvider } from "./contexts/PortalAuthContext";
import { AppShell } from "./layouts/AppShell";
import { PortalApp } from "./PortalApp";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { OperationsPage } from "./pages/OperationsPage";
import { AdministrationPage } from "./pages/AdministrationPage";
import { TurnsPage } from "./pages/TurnsPage";
import { UnitsPage } from "./pages/UnitsPage";
import { MyWorkPage } from "./pages/MyWorkPage";
import { PoolLogsPage } from "./pages/PoolLogsPage";
import { TemplatesPage } from "./pages/TemplatesPage";
import { AuditLogPage } from "./pages/AuditLogPage";
import { ResidentsPage } from "./pages/ResidentsPage";
import { LeasingPage } from "./pages/LeasingPage";
import { CommunicationsPage } from "./pages/CommunicationsPage";
import { FinancialPage } from "./pages/FinancialPage";
import { PlatformAdminPage } from "./pages/PlatformAdminPage";
import { WorkOrdersPage } from "./pages/WorkOrdersPage";
import { InspectionsPage } from "./pages/InspectionsPage";
import { InventoryPage } from "./pages/InventoryPage";
import { RecurringJobsPage } from "./pages/RecurringJobsPage";
import { VendorsPage } from "./pages/VendorsPage";
import { useRouter } from "./lib/router";
import { OPERATIONS_TAB_REDIRECTS, STAFF_PATHS } from "./lib/staffRoutes";

export default function App() {
  const { path, navigate } = useRouter();
  const isPortal = path === "/portal" || path.startsWith("/portal/");

  if (isPortal) {
    return <PortalAuthProvider><PortalApp /></PortalAuthProvider>;
  }

  return <StaffApp path={path} navigate={navigate} />;
}

function StaffApp({ path, navigate }: { path: string; navigate: (to: string, options?: { replace?: boolean }) => void }) {
  const { search } = useRouter();
  const { user, loading } = useAuth();
  const validPath = STAFF_PATHS.includes(path as typeof STAFF_PATHS[number])
    || /^\/my-work\/[^/]+$/.test(path)
    || /^\/turns\/[^/]+$/.test(path);

  useEffect(() => {
    if (path === "/operations") {
      const tab = new URLSearchParams(search).get("tab");
      if (tab && tab !== "overview") {
        const next = OPERATIONS_TAB_REDIRECTS[tab];
        if (next) {
          navigate(next, { replace: true });
          return;
        }
      }
    }
    if (!validPath) navigate("/", { replace: true });
  }, [path, search, validPath, navigate]);

  if (loading) return <div className="app-loading staff-app-loading"><span className="brand__mark">PS</span></div>;
  if (!user) return <LoginPage />;

  let page;
  if (path === "/") page = <DashboardPage />;
  else if (path === "/my-work" || /^\/my-work\/[^/]+$/.test(path)) page = <MyWorkPage />;
  else if (path === "/turns" || /^\/turns\/[^/]+$/.test(path)) page = <TurnsPage />;
  else if (path === "/units") page = <UnitsPage />;
  else if (path === "/pool-logs") page = <PoolLogsPage />;
  else if (path === "/operations") page = <OperationsPage />;
  else if (path === "/work-orders") page = <WorkOrdersPage />;
  else if (path === "/inspections") page = <InspectionsPage />;
  else if (path === "/inventory") page = <InventoryPage />;
  else if (path === "/recurring-jobs") page = <RecurringJobsPage />;
  else if (path === "/vendors") page = <VendorsPage />;
  else if (path === "/templates") page = <TemplatesPage />;
  else if (path === "/administration") page = <AdministrationPage />;
  else if (path === "/audit") page = <AuditLogPage />;
  else if (path === "/residents") page = <ResidentsPage />;
  else if (path === "/leasing") page = <LeasingPage />;
  else if (path === "/communications") page = <CommunicationsPage />;
  else if (path === "/financial") page = <FinancialPage />;
  else if (path === "/platform-admin") page = <PlatformAdminPage />;
  else page = <DashboardPage />;

  return <AppShell>{page}</AppShell>;
}
