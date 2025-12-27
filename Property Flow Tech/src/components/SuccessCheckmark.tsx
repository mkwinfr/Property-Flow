import React from 'react';
import './SuccessCheckmark.css';

interface SuccessCheckmarkProps {
  isVisible: boolean;
  message?: string;
}

export const SuccessCheckmark: React.FC<SuccessCheckmarkProps> = ({
  isVisible,
  message = 'Success!',
}) => {
  if (!isVisible) return null;

  return (
    <div className="success-checkmark-overlay">
      <div className="success-checkmark">
        <div className="success-checkmark-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        {message && <p className="success-checkmark-message">{message}</p>}
      </div>
    </div>
  );
};
