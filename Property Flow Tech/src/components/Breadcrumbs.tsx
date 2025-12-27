import React from 'react';
import './Breadcrumbs.css';

interface Breadcrumb {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: Breadcrumb[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {items.map((item, idx) => (
          <li key={idx} className="breadcrumbs-item">
            {item.onClick ? (
              <button className="breadcrumbs-link" onClick={item.onClick}>
                {item.label}
              </button>
            ) : (
              <span className="breadcrumbs-current">{item.label}</span>
            )}
            {idx < items.length - 1 && <span className="breadcrumbs-separator">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
};
