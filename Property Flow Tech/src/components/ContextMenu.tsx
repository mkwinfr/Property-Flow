import React, { useState, useRef, useEffect } from 'react';
import './ContextMenu.css';

interface ContextMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  isDangerous?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ items, x, y, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let newX = x;
      let newY = y;

      // Keep menu in viewport
      if (rect.right > window.innerWidth) {
        newX = window.innerWidth - rect.width - 10;
      }
      if (rect.bottom > window.innerHeight) {
        newY = window.innerHeight - rect.height - 10;
      }

      setPosition({ x: newX, y: newY });
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ top: `${position.y}px`, left: `${position.x}px` }}
    >
      {items.map((item, idx) => (
        <button
          key={idx}
          className={`context-menu-item ${item.isDangerous ? 'dangerous' : ''}`}
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.icon && <span className="context-menu-item-icon">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
};

export const useContextMenu = () => {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  const closeMenu = () => setMenu(null);

  return { menu, handleContextMenu, closeMenu };
};
