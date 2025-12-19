import { useState, useEffect } from 'react';
import './PunchListOverview.css';

interface PunchListOverviewProps {
  turnId: string;
  onClose: () => void;
}

interface PunchListStats {
  total: number;
  completed: number;
  open: number;
  inProgress: number;
  byRoom: Array<{
    room: string;
    total: number;
    completed: number;
  }>;
}

export const PunchListOverview: React.FC<PunchListOverviewProps> = ({ turnId, onClose }) => {
  const [stats, setStats] = useState<PunchListStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPunchListStats = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: Replace with actual API endpoint when backend is ready
        // const response = await fetch(apiUrl(`/api/turns/${turnId}/punch-list/stats`));
        // if (!response.ok) throw new Error('Failed to fetch punch list stats');
        // const data = await response.json();
        
        // Mock data for now
        const mockData: PunchListStats = {
          total: 132,
          completed: 67,
          open: 58,
          inProgress: 7,
          byRoom: [
            { room: 'Master Bedroom', total: 12, completed: 8 },
            { room: 'Master Bathroom', total: 24, completed: 16 },
            { room: 'Spare Bedroom', total: 11, completed: 7 },
            { room: 'Spare Bathroom', total: 18, completed: 10 },
            { room: 'Kitchen', total: 19, completed: 9 },
            { room: 'Laundry', total: 9, completed: 5 },
            { room: 'Living Room / Dining Room', total: 13, completed: 6 },
            { room: 'A/C Closet', total: 8, completed: 4 },
            { room: 'Patio', total: 11, completed: 2 },
            { room: 'Trash', total: 7, completed: 0 },
          ],
        };
        
        setStats(mockData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load punch list stats');
      } finally {
        setLoading(false);
      }
    };

    fetchPunchListStats();
  }, [turnId]);

  if (loading) {
    return (
      <div className="punch-overview-container">
        <div className="punch-overview-header">
          <h2>Punch List Overview</h2>
          <button onClick={onClose} className="punch-overview-close">✕</button>
        </div>
        <div className="punch-overview-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="punch-overview-container">
        <div className="punch-overview-header">
          <h2>Punch List Overview</h2>
          <button onClick={onClose} className="punch-overview-close">✕</button>
        </div>
        <div className="punch-overview-error">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  const completionPercentage = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  return (
    <div className="punch-overview-container">
      <div className="punch-overview-header">
        <h2>Punch List Overview</h2>
        <button onClick={onClose} className="punch-overview-close">✕</button>
      </div>

      <div className="punch-overview-content">
        {/* Overall Progress */}
        <div className="punch-overview-section">
          <div className="punch-overview-progress-header">
            <span className="punch-overview-progress-label">Overall Progress</span>
            <span className="punch-overview-progress-percent">{completionPercentage}%</span>
          </div>
          <div className="punch-overview-progress-bar">
            <div 
              className="punch-overview-progress-fill" 
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="punch-overview-stats-row">
            <span className="punch-overview-stat">
              <span className="punch-overview-stat-value">{stats.completed}</span>
              <span className="punch-overview-stat-label">Complete</span>
            </span>
            <span className="punch-overview-stat">
              <span className="punch-overview-stat-value">{stats.inProgress}</span>
              <span className="punch-overview-stat-label">In Progress</span>
            </span>
            <span className="punch-overview-stat">
              <span className="punch-overview-stat-value">{stats.open}</span>
              <span className="punch-overview-stat-label">Open</span>
            </span>
          </div>
        </div>

        {/* By Room */}
        <div className="punch-overview-section">
          <h3 className="punch-overview-section-title">By Room</h3>
          <div className="punch-overview-rooms">
            {stats.byRoom.map((room) => {
              const roomPercent = room.total > 0 
                ? Math.round((room.completed / room.total) * 100) 
                : 0;
              return (
                <div key={room.room} className="punch-overview-room">
                  <div className="punch-overview-room-header">
                    <span className="punch-overview-room-name">{room.room}</span>
                    <span className="punch-overview-room-count">
                      {room.completed}/{room.total}
                    </span>
                  </div>
                  <div className="punch-overview-room-bar">
                    <div 
                      className="punch-overview-room-fill" 
                      style={{ width: `${roomPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
