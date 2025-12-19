import React, { useState, useEffect } from 'react';
import type { Turn, TurnModalTab } from '@/types/turn-management';
import { TurnStatus } from '@/types/turn-management';
import { apiUrl } from '@/config/api';
import MoveOutInspectionTab from './tabs/MoveOutInspectionTab';
import PunchListTab from './tabs/PunchListTab';
import VendorServicesTab from './tabs/VendorServicesTab';
import UpdatesLogTab from './tabs/UpdatesLogTab';
import './styles/turn-modal.css';

interface TurnModalProps {
  isOpen: boolean;
  turn?: Turn;
  onClose: () => void;
}

const TurnModal: React.FC<TurnModalProps> = ({ isOpen, turn, onClose }) => {
  const [enrichedTurn, setEnrichedTurn] = useState<Turn | undefined>(turn);
  const [loading, setLoading] = useState(false);

  // Fetch related data when modal opens
  useEffect(() => {
    if (!isOpen || !turn?.id) {
      setEnrichedTurn(turn);
      return;
    }

    const fetchTurnData = async () => {
      try {
        setLoading(true);
        // Fetch complete turn data with all relations
        const turnRes = await fetch(apiUrl(`/api/turns/${turn.id}`));
        if (!turnRes.ok) throw new Error('Failed to fetch turn');
        const fullTurn = await turnRes.json();
        setEnrichedTurn(fullTurn);
      } catch (err) {
        console.error('Error fetching turn data:', err);
        setEnrichedTurn(turn);
      } finally {
        setLoading(false);
      }
    };

    fetchTurnData();
  }, [isOpen, turn?.id, turn]);

  // Determine default tab based on turn status
  const getDefaultTab = (): TurnModalTab['id'] => {
    if (!enrichedTurn) return 'move-out';
    
    switch (enrichedTurn.status) {
      case TurnStatus.PENDING:
      case TurnStatus.VACANT:
        return 'move-out';
      case TurnStatus.IN_PROGRESS:
        return 'punch-list';
      case TurnStatus.PENDING_REVIEW:
      case TurnStatus.VACANT_READY:
        return 'updates';
      default:
        return 'move-out';
    }
  };

  const [activeTab, setActiveTab] = useState<TurnModalTab['id']>(getDefaultTab());

  const tabs: TurnModalTab[] = [
    { id: 'move-out', label: 'Move Out', icon: '📋' },
    { id: 'punch-list', label: 'Punch List', icon: '✓' },
    { id: 'vendor', label: 'Vendor', icon: '🔧' },
    { id: 'updates', label: 'Updates', icon: '📜' },
  ];

  if (!isOpen || !enrichedTurn) return null;

  const displayTurn = enrichedTurn;
  
  // Calculate completion stats for punch list
  const punchListItems = displayTurn.punchListItems || [];
  const completedCount = punchListItems.filter((item) => item.status === 'COMPLETE').length;
  const totalCount = punchListItems.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="turn-modal-overlay" onClick={onClose}>
      <div className="turn-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="turn-modal-header">
          <div className="turn-modal-title">
            <h2>Unit {displayTurn.apartment?.unitNumber}</h2>
            <span className={`status-badge status-${displayTurn.status.toLowerCase()}`}>
              {displayTurn.status.replace(/_/g, ' ')}
            </span>
            {totalCount > 0 && (
              <span className="completion-badge">
                Completion: {completedCount} of {totalCount} items {completionPercentage}%
              </span>
            )}
          </div>
          <button className="turn-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs Navigation */}
        <div className="turn-modal-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`turn-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="turn-modal-content">
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading turn data...</div>
          ) : (
            <>
              {activeTab === 'move-out' && <MoveOutInspectionTab turn={displayTurn} />}
              {activeTab === 'punch-list' && <PunchListTab turn={displayTurn} />}
              {activeTab === 'vendor' && displayTurn && <VendorServicesTab turn={displayTurn} />}
              {activeTab === 'updates' && <UpdatesLogTab turn={displayTurn} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TurnModal;
