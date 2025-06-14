// frontend/src/components/common/Modal.tsx
import React, { useEffect } from 'react';
import Button from './Button'; // Assuming you have your Button component

interface ModalProps {
  isOpen: boolean;
  onClose: () => void; // Made onClose non-optional for a functional modal
  title?: string;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footerContent,
  size = 'md',
}) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 overflow-y-auto h-full w-full flex justify-center items-center z-[1000] transition-opacity duration-300 ease-in-out"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`relative p-6 border-0 shadow-2xl rounded-lg bg-white transform transition-all duration-300 ease-in-out w-full mx-4 ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - Always rendered for the close button */}
        <div className="flex justify-between items-center pb-3 mb-4 border-b border-gray-200">
          {title ? (
            <h3 className="text-xl leading-6 font-semibold text-gray-900">{title}</h3>
          ) : (
            <span /> // Placeholder to keep close button to the right if no title
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose} // This onClose is now guaranteed to be a function
            className="p-1 text-gray-400 hover:text-gray-600 focus:ring-0" // Added focus:ring-0 for ghost
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </Button>
        </div>

        {/* Modal Body */}
        <div className="text-sm text-gray-700">{children}</div>

        {/* Modal Footer */}
        {footerContent && (
          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end space-x-3">
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;