import { useEffect, useState } from "react";

import SplashScreen from "./components/Splash Screen/SplashScreen";
import Dashboard from "./pages/Dashboard/Dashboard";
import Login from "./pages/Login/Login";
import { AuthProvider, useAuth } from "./contexts/AuthContext";


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
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
