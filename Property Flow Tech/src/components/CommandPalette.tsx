import React, { useState, useEffect, useRef } from 'react';
import './CommandPalette.css';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  category: string;
  onSelect: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  commands: Command[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ commands }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Trigger with Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setSearch('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredCommands = commands.filter(cmd =>
    search === '' ||
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description?.toLowerCase().includes(search.toLowerCase()) ||
    cmd.keywords?.some(k => k.includes(search.toLowerCase()))
  );

  const grouped = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  const flatCommands = Object.values(grouped).flat();

  const handleSelect = (cmd: Command) => {
    cmd.onSelect();
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(Math.min(selectedIndex + 1, flatCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(Math.max(selectedIndex - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatCommands[selectedIndex]) {
        handleSelect(flatCommands[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={() => setIsOpen(false)}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette-input-wrapper">
          <span className="command-palette-icon">⌘</span>
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Search commands..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            aria-label="Command search"
          />
        </div>

        <div className="command-palette-results">
          {flatCommands.length === 0 ? (
            <div className="command-palette-empty">No commands found</div>
          ) : (
            Object.entries(grouped).map(([category, cmds]) => (
              <div key={category} className="command-palette-group">
                <div className="command-palette-group-label">{category}</div>
                {cmds.map((cmd, idx) => {
                  const globalIdx = flatCommands.findIndex(c => c.id === cmd.id);
                  return (
                    <button
                      key={cmd.id}
                      className={`command-palette-item ${
                        globalIdx === selectedIndex ? 'selected' : ''
                      }`}
                      onClick={() => handleSelect(cmd)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                    >
                      {cmd.icon && <span className="command-palette-item-icon">{cmd.icon}</span>}
                      <div className="command-palette-item-text">
                        <div className="command-palette-item-label">{cmd.label}</div>
                        {cmd.description && (
                          <div className="command-palette-item-description">{cmd.description}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="command-palette-footer">
          <div className="command-palette-hint">
            <kbd>↑↓</kbd> to navigate <kbd>Enter</kbd> to select <kbd>Esc</kbd> to close
          </div>
        </div>
      </div>
    </div>
  );
};
