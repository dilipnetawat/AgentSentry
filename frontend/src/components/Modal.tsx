import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, actions, size = 'md' }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const maxWidthMap: Record<string, string> = {
    sm: '420px',
    md: '560px',
    lg: '720px',
    xl: '880px',
  };
  const maxWidth = maxWidthMap[size] || size;

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="modal-backdrop" 
          onClick={onClose} 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="modal-title"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="modal-content" 
            style={{ maxWidth }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="modal-title">{title}</h3>
              <button 
                className="modal-close" 
                onClick={onClose} 
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {children}
            </div>
            {actions && (
              <div className="modal-footer">
                {actions}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
