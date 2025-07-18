
import React from 'react';
import './Dialog.css';

export default function Dialog({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = '',
  showCloseButton = true,
  closeOnOverlayClick = true,
  size = 'medium' // small, medium, large
}) {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <div className="dialog-overlay" onClick={handleOverlayClick}>
      <div className={`dialog-container ${size} ${className}`} onClick={(e) => e.stopPropagation()}>
        {(title || showCloseButton) && (
          <div className="dialog-header">
            {title && <h3 className="dialog-title">{title}</h3>}
            {showCloseButton && (
              <button className="dialog-close-btn" onClick={onClose}>
                ×
              </button>
            )}
          </div>
        )}
        <div className="dialog-content">
          {children}
        </div>
      </div>
    </div>
  );
}
