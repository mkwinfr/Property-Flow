import React, { useState } from 'react';
import './AutoSaveIndicator.css';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveIndicatorProps {
  state: SaveState;
  lastSaved?: Date;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  state,
  lastSaved,
}) => {
  const getMessage = () => {
    switch (state) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Save failed';
      default:
        return '';
    }
  };

  const getIcon = () => {
    switch (state) {
      case 'saving':
        return '💾';
      case 'saved':
        return '✓';
      case 'error':
        return '✕';
      default:
        return '';
    }
  };

  return (
    <div className={`auto-save-indicator auto-save-indicator--${state}`}>
      {getIcon() && <span className="auto-save-icon">{getIcon()}</span>}
      {getMessage() && (
        <span className="auto-save-message">{getMessage()}</span>
      )}
    </div>
  );
};

export const useAutoSave = () => {
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const save = async (fn: () => Promise<void>) => {
    try {
      setSaveState('saving');
      await fn();
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (error) {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  return { saveState, save };
};
