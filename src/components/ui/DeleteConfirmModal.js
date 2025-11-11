import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

const DeleteConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Delete", 
  message,
  itemName,
  itemType = "item",
  isLoading = false 
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const getDefaultMessage = () => {
    if (message) return message;
    if (itemName) {
      return `Are you sure you want to delete "${itemName}"? This action cannot be undone.`;
    }
    return `Are you sure you want to delete this ${itemType}? This action cannot be undone.`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-text-secondary leading-relaxed">
            {getDefaultMessage()}
          </p>
          
          {itemType === 'folder' && (
            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-400">
                <strong>Warning:</strong> This will also delete all files and subfolders contained within this folder.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            loading={isLoading}
            className="min-w-[100px]"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmModal;