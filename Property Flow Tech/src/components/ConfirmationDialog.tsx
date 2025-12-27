import React from 'react';
import './ConfirmationDialog.css';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDangerous = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirmation-dialog-overlay" onClick={onCancel}>
      <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirmation-dialog-header">
          <h2>{title}</h2>
          <button className="confirmation-dialog-close" onClick={onCancel}>×</button>
        </div>
        <div className="confirmation-dialog-body">
          <p>{message}</p>
        </div>
        <div className="confirmation-dialog-footer">
          <button 
            className="btn btn-secondary" 
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button 
            className={`btn ${isDangerous ? 'btn-danger' : 'btn-primary'}`} 
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
