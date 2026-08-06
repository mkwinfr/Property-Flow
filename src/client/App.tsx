import { useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { AppShell } from "./layouts/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { OperationsPage } from "./pages/OperationsPage";
import { AdministrationPage } from "./pages/AdministrationPage";
import { TurnsPage } from "./pages/TurnsPage";
import { UnitsPage } from "./pages/UnitsPage";
import { MyWorkPage } from "./pages/MyWorkPage";
import { PoolLogsPage } from "./pages/PoolLogsPage";
import { TemplatesPage } from "./pages/TemplatesPage";
import { useRouter } from "./lib/router";

export default function App() {
  const { user, loading } = useAuth();
  const { path, navigate } = useRouter();
  const validPath = path === "/" || path === "/my-work" || /^\/my-work\/[^/]+$/.test(path) || path === "/turns" || /^\/turns\/[^/]+$/.test(path) || path === "/units" || path === "/pool-logs" || path === "/operations" || path === "/templates" || path === "/administration";
  useEffect(() => {
    if (!validPath) navigate("/", { replace: true });
  }, [validPath, navigate]);
  if (loading) return <div className="app-loading"><span className="brand__mark">PS</span></div>;
  if (!user) return <LoginPage />;
  let page;
  if (path === "/") page = <DashboardPage />;
  else if (path === "/my-work" || /^\/my-work\/[^/]+$/.test(path)) page = <MyWorkPage />;
  else if (path === "/turns" || /^\/turns\/[^/]+$/.test(path)) page = <TurnsPage />;
  else if (path === "/units") page = <UnitsPage />;
  else if (path === "/pool-logs") page = <PoolLogsPage />;
  else if (path === "/operations") page = <OperationsPage />;
  else if (path === "/templates") page = <TemplatesPage />;
  else if (path === "/administration") page = <AdministrationPage />;
  else page = <DashboardPage />;
  return <AppShell>{page}</AppShell>;
}
