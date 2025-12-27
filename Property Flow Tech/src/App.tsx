import { useEffect, useState } from "react";

import SplashScreen from "./components/Splash Screen/SplashScreen";
import Dashboard from "./pages/Dashboard/Dashboard";
import Login from "./pages/Login/Login";
import NotificationContainer from "./components/NotificationContainer";
import { ToastContainer } from "./components/Toast";
import { ProgressBar } from "./components/ProgressBar";
import { ConnectionStatus, useConnectionStatus } from "./components/ConnectionStatus";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ToastProvider } from "./contexts/ToastContext";


///
const AppContent: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { isAuthenticated } = useAuth();
  const isOnline = useConnectionStatus();

  useEffect(() => {
    const splashDuration = 4400;
    const timer = setTimeout(() => setShowSplash(false), splashDuration);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app-root">
      <ProgressBar />
      <NotificationContainer />
      <ToastContainer />
      <ConnectionStatus isOnline={isOnline} />
      {showSplash ? (
        <SplashScreen />
      ) : (
        <div className="app-fade-in">
          {isAuthenticated ? <Dashboard /> : <Login />}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <NotificationProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </NotificationProvider>
  </ToastProvider>
);

export default App;
