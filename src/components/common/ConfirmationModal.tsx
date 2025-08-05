import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'danger' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'warning'
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          headerBg: 'bg-red-500',
          confirmBg: 'bg-red-600 hover:bg-red-700',
          icon: '⚠️'
        };
      case 'warning':
        return {
          headerBg: 'bg-yellow-500',
          confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
          icon: '⚠️'
        };
      case 'info':
        return {
          headerBg: 'bg-blue-500',
          confirmBg: 'bg-blue-600 hover:bg-blue-700',
          icon: 'ℹ️'
        };
      default:
        return {
          headerBg: 'bg-yellow-500',
          confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
          icon: '⚠️'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
        {/* Header */}
        <div className={`${styles.headerBg} text-white px-6 py-4 rounded-t-lg flex items-center`}>
          <span className="text-2xl mr-3">{styles.icon}</span>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-700 text-base leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`w-full sm:w-auto px-4 py-2 text-white ${styles.confirmBg} rounded-md transition-colors font-medium`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal; 