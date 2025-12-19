import React, { useState } from 'react';
import type { Turn, TurnActivityLog } from '@/types/turn-management';
import { TurnStatus } from '@/types/turn-management';
import { apiUrl } from '@/config/api';
import { useNotifications } from '@/context/NotificationContext';
import './UpdatesLogTab.css';

interface UpdatesLogTabProps {
  turn: Turn;
  onTurnUpdate?: (updatedTurn: Turn) => void;
}

const UpdatesLogTab: React.FC<UpdatesLogTabProps> = ({ turn, onTurnUpdate }) => {
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activityLogs = turn.activityLogs || [];

  const handleManagerApprove = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(apiUrl(`/api/turns/${turn.id}/manager-approve`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to approve turn');
      const updatedTurn = await res.json();
      onTurnUpdate?.(updatedTurn);
      addNotification({
        type: 'success',
        title: 'Turn Approved',
        message: `Unit ${updatedTurn.apartment?.unitNumber} is now marked Vacant Ready`,
        duration: 4000,
      });
      window.dispatchEvent(new CustomEvent('turn-updated', { detail: { turn: updatedTurn } }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error approving turn';
      setError(message);
      addNotification({
        type: 'error',
        title: 'Approval Failed',
        message,
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManagerRequestRework = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(apiUrl(`/api/turns/${turn.id}/manager-request-rework`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Requesting rework' }),
      });
      if (!res.ok) throw new Error('Failed to request rework');
      const updatedTurn = await res.json();
      onTurnUpdate?.(updatedTurn);
      addNotification({
        type: 'warning',
        title: 'Rework Requested',
        message: `Unit ${updatedTurn.apartment?.unitNumber} has been sent back for rework`,
        duration: 4000,
      });
      window.dispatchEvent(new CustomEvent('turn-updated', { detail: { turn: updatedTurn } }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error requesting rework';
      setError(message);
      addNotification({
        type: 'error',
        title: 'Rework Request Failed',
        message,
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatActivityMessage = (log: TurnActivityLog): string => {
    const actor = log.user?.name || 'System';
    
    switch (log.activityType) {
      case 'ITEM_COMPLETED':
        return `${actor} marked an item complete`;
      case 'PUNCH_LIST_COMPLETED':
        return `${actor} completed the punch list`;
      case 'MANAGER_REVIEW_STARTED':
        return `${actor} started manager review`;
      case 'MANAGER_APPROVED':
        return `${actor} approved and marked unit Vacant Ready`;
      case 'MANAGER_REQUESTED_REWORK':
        return `${actor} requested additional work`;
      case 'INVENTORY_USED':
        return `${actor} used inventory: ${log.details?.itemName}`;
      case 'COST_OVERRIDDEN':
        return `${actor} overrode cost to $${log.details?.newCost}`;
      case 'TURN_STATUS_CHANGED':
        return `${actor} changed status to ${log.details?.newStatus}`;
      default:
        return `${actor} performed action: ${log.activityType}`;
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="updates-log-tab">
      <div className="activity-timeline">
        <h3>Activity Log</h3>

        {activityLogs.length === 0 ? (
          <div className="empty-state">
            <p>No activity yet</p>
          </div>
        ) : (
          <div className="timeline">
            {activityLogs.map((log) => (
              <div key={log.id} className="timeline-item">
                <div className="timeline-marker" />
                <div className="timeline-content">
                  <div className="activity-message">
                    {formatActivityMessage(log)}
                  </div>
                  <div className="activity-time">
                    {formatTime(log.createdAt)}
                  </div>
                  {log.details?.notes && (
                    <div className="activity-notes">
                      {log.details.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {turn.costBreakdown && (
        <div className="cost-breakdown">
          <h3>Cost Analysis</h3>
          <div className="cost-item">
            <span>Labor Cost</span>
            <span>${turn.costBreakdown.laborCost.toFixed(2)}</span>
          </div>
          <div className="cost-item">
            <span>Materials Cost</span>
            <span>${turn.costBreakdown.materialsCost.toFixed(2)}</span>
          </div>
          <div className="cost-item">
            <span>Vendor Services</span>
            <span>${turn.costBreakdown.vendorServicesCost.toFixed(2)}</span>
          </div>
          <div className="cost-item total">
            <span>Total</span>
            <span>${turn.costBreakdown.totalCost.toFixed(2)}</span>
          </div>
        </div>
      )}

      {turn.status === TurnStatus.PENDING_REVIEW && (
        <div className="manager-actions">
          <h3>Manager Review</h3>
          {error && <div className="error-message">{error}</div>}
          <div className="action-buttons">
            <button
              className="action-btn approve-btn"
              onClick={handleManagerApprove}
              disabled={loading}
            >
              {loading ? 'Processing...' : '✓ Approve & Mark Vacant Ready'}
            </button>
            <button
              className="action-btn rework-btn"
              onClick={handleManagerRequestRework}
              disabled={loading}
            >
              {loading ? 'Processing...' : '↻ Request Rework'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdatesLogTab;
