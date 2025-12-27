import { useEffect } from 'react';

interface KeyboardShortcutsConfig {
  onEscape?: () => void;
  onEnter?: () => void;
  onCommandK?: () => void;
}

export const useKeyboardShortcuts = (config: KeyboardShortcutsConfig) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && config.onEscape) {
        config.onEscape();
      }
      if (e.key === 'Enter' && config.onEnter) {
        config.onEnter();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && config.onCommandK) {
        e.preventDefault();
        config.onCommandK();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config.onEscape, config.onEnter, config.onCommandK]);
};
