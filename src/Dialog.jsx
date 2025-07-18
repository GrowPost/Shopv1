import React from 'react';
import './Dialog.css';

const Dialog = ({ isOpen, onClose, title, children, className = '', size = 'medium' }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="dialog-overlay" onClick={handleOverlayClick} key="dialog-overlay">
      <div className={`dialog-container ${className} ${size}`} key="dialog-container">
        <div className="dialog-header" key="dialog-header">
          <h3 className="dialog-title">{title}</h3>
          <button className="dialog-close-btn" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <div className="dialog-content" key="dialog-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Dialog;