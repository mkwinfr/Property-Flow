import { useEffect, useState } from "react";

import "./App.css";
import SplashScreen from "./components/Splash Screen/SplashScreen";
import Dashboard from "./pages/Dashboard/Dashboard";


///
const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

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
          <Dashboard />
        </div>
      )}
    </div>
  );
};

export default App;
