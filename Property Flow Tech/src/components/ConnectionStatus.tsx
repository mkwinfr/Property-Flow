import React from 'react';
import './ConnectionStatus.css';

interface ConnectionStatusProps {
  isOnline: boolean;
  onReconnect?: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isOnline,
  onReconnect,
}) => {
  if (isOnline) return null;

  return (
    <div className="connection-status offline">
      <span className="connection-status-indicator"></span>
      <span className="connection-status-text">Offline</span>
      {onReconnect && (
        <button className="connection-status-button" onClick={onReconnect}>
          Reconnect
        </button>
      )}
    </div>
  );
};

export const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
