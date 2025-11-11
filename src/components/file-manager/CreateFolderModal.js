import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FolderPlus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import api from '../../services/api';

const CreateFolderModal = ({ isOpen, onClose, parentFolderId }) => {
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const createFolderMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/folders/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      setFolderName('');
      setError('');
      onClose();
    },
    onError: (error) => {
      setError(error.response?.data?.error || 'Failed to create folder');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!folderName.trim()) {
      setError('Folder name is required');
      return;
    }

    createFolderMutation.mutate({
      name: folderName.trim(),
      parent: parentFolderId || null
    });
  };

  const handleClose = () => {
    setFolderName('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Folder">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-accent-secondary/20 rounded-lg flex items-center justify-center">
            <FolderPlus className="w-6 h-6 text-accent-secondary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">New Folder</h3>
            <p className="text-text-secondary text-sm">
              {parentFolderId ? 'Create a new folder in the current location' : 'Create a new folder in My Files'}
            </p>
          </div>
        </div>

        <Input
          label="Folder Name"
          value={folderName}
          onChange={(e) => {
            setFolderName(e.target.value);
            setError('');
          }}
          placeholder="Enter folder name"
          error={error}
          autoFocus
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary"
            loading={createFolderMutation.isPending}
            disabled={!folderName.trim()}
          >
            Create Folder
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateFolderModal;