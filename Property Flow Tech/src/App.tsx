import { useEffect, useState } from "react";

import SplashScreen from "./components/Splash Screen/SplashScreen";
import Dashboard from "./pages/Dashboard/Dashboard";
import Login from "./pages/Login/Login";
import NotificationContainer from "./components/NotificationContainer";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";


///
const AppContent: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const splashDuration = 4400;
    const timer = setTimeout(() => setShowSplash(false), splashDuration);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app-root">
      <NotificationContainer />
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
  <NotificationProvider>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </NotificationProvider>
);

export default App;
