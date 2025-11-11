import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FolderPlus, 
  Search, 
  Grid3X3, 
  List,
  Folder,
  FileText,
  Image,
  Video,
  Info,
  Download,
  Share2,
  Trash2,
  MoreVertical,
  Move
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatFileSize, formatDate } from '../../utils/helpers';
import { useDownload } from '../../hooks/useDownload';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';
import DownloadProgress from '../ui/DownloadProgress';
import api from '../../services/api';

const DragDropFileManager = ({ 
  files, 
  folders, 
  onFileSelect, 
  onFolderNavigate,
  onUpload,
  onCreateFolder,
  selectedFile,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  currentFolderId
}) => {
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [showMoveModal, setShowMoveModal] = useState(null);
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: null, // 'file' or 'folder'
    item: null
  });
  
  const queryClient = useQueryClient();
  const { downloadFile, downloadProgress, downloadStatus } = useDownload();

  const moveFileMutation = useMutation({
    mutationFn: async ({ fileId, folderId }) => {
      const response = await api.post(`/files/${fileId}/move/`, { folder_id: folderId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
    }
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId) => {
      await api.delete(`/files/${fileId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
    }
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId) => {
      await api.delete(`/folders/${folderId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
    }
  });

  const handleDragStart = useCallback((e, item, type) => {
    setDraggedItem({ ...item, type });
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e, folderId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(folderId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback((e, targetFolderId) => {
    e.preventDefault();
    
    if (draggedItem && draggedItem.type === 'file') {
      moveFileMutation.mutate({
        fileId: draggedItem.id,
        folderId: targetFolderId
      });
    }
    
    setDraggedItem(null);
    setDropTarget(null);
  }, [draggedItem, moveFileMutation]);

  const handleDeleteFile = (file) => {
    setDeleteModal({
      isOpen: true,
      type: 'file',
      item: file
    });
  };

  const handleDeleteFolder = (folder) => {
    setDeleteModal({
      isOpen: true,
      type: 'folder',
      item: folder
    });
  };

  const confirmDelete = () => {
    if (deleteModal.type === 'file') {
      deleteFileMutation.mutate(deleteModal.item.id);
    } else if (deleteModal.type === 'folder') {
      deleteFolderMutation.mutate(deleteModal.item.id);
    }
    setDeleteModal({ isOpen: false, type: null, item: null });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, type: null, item: null });
  };

  const handleDownload = async (file) => {
    try {
      await downloadFile(file.id, file.name);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return Image;
    if (mimeType?.startsWith('video/')) return Video;
    return FileText;
  };

  const FileItem = ({ file, isGrid }) => {
    const Icon = getFileIcon(file.mime_type);
    const isSelected = selectedFile === file.id;
    const isDragging = draggedItem?.id === file.id && draggedItem?.type === 'file';
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: isDragging ? 0.5 : 1, 
          scale: isDragging ? 0.95 : 1 
        }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ scale: isGrid ? 1.02 : 1 }}
        draggable
        onDragStart={(e) => handleDragStart(e, file, 'file')}
        onClick={() => onFileSelect(file.id)}
        className={`
          bg-dark-surface1 border rounded-lg p-4 hover:bg-dark-hover transition-colors cursor-pointer
          ${isGrid ? 'aspect-square flex flex-col' : 'flex items-center space-x-4'}
          ${isSelected ? 'border-accent-primary bg-accent-primary/10' : 'border-dark-border'}
          ${isDragging ? 'opacity-50' : ''}
        `}
      >
        <div className={`${isGrid ? 'flex-1 flex items-center justify-center' : ''}`}>
          <Icon className="w-8 h-8 text-accent-primary" />
          {file.status === 'processing' && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent-warning text-white">
                Processing
              </span>
            </div>
          )}
        </div>
        <div className={`${isGrid ? 'mt-2' : 'flex-1'}`}>
          <p className="text-text-primary font-medium truncate">{file.name}</p>
          <p className="text-text-muted text-sm">
            {formatFileSize(file.size_bytes)} • {formatDate(file.created_at)}
          </p>
        </div>
        {!isGrid && (
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onFileSelect(file.id);
              }}
            >
              <Info className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowMoveModal(file.id);
              }}
            >
              <Move className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(file);
              }}
              loading={downloadStatus[file.id] === 'downloading'}
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFile(file);
              }}
            >
              <Trash2 className="w-4 h-4 text-accent-error" />
            </Button>
          </div>
        )}
      </motion.div>
    );
  };

  const FolderItem = ({ folder, isGrid }) => {
    const isDropTarget = dropTarget === folder.id;
    const isDragging = draggedItem?.id === folder.id && draggedItem?.type === 'folder';
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: isDragging ? 0.5 : 1, 
          scale: isDragging ? 0.95 : (isDropTarget ? 1.05 : 1)
        }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ scale: isGrid ? 1.02 : 1 }}
        onDragOver={(e) => handleDragOver(e, folder.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, folder.id)}
        onClick={() => onFolderNavigate(folder.id)}
        className={`
          bg-dark-surface1 border rounded-lg p-4 hover:bg-dark-hover transition-all cursor-pointer
          ${isGrid ? 'aspect-square flex flex-col' : 'flex items-center space-x-4'}
          ${isDropTarget ? 'border-accent-secondary bg-accent-secondary/10 shadow-lg' : 'border-dark-border'}
          ${isDragging ? 'opacity-50' : ''}
        `}
      >
        <div className={`${isGrid ? 'flex-1 flex items-center justify-center' : ''}`}>
          <Folder className={`w-8 h-8 ${isDropTarget ? 'text-accent-secondary' : 'text-accent-secondary'}`} />
        </div>
        <div className={`${isGrid ? 'mt-2' : 'flex-1'}`}>
          <p className="text-text-primary font-medium truncate">{folder.name}</p>
          <p className="text-text-muted text-sm">
            {folder.files_count || 0} files • {formatDate(folder.created_at)}
          </p>
        </div>
        {!isGrid && (
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFolder(folder);
              }}
            >
              <Trash2 className="w-4 h-4 text-accent-error" />
            </Button>
          </div>
        )}
      </motion.div>
    );
  };

  const filteredFolders = Array.isArray(folders) ? folders.filter(folder => 
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];
  
  const filteredFiles = Array.isArray(files) ? files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Folders */}
        <AnimatePresence>
          {filteredFolders.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h3 className="text-lg font-semibold text-text-primary mb-4">Folders</h3>
              <div className={`
                ${viewMode === 'grid' 
                  ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4' 
                  : 'space-y-2'
                }
              `}>
                {filteredFolders.map((folder) => (
                  <FolderItem key={folder.id} folder={folder} isGrid={viewMode === 'grid'} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Files */}
        <AnimatePresence>
          {filteredFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h3 className="text-lg font-semibold text-text-primary mb-4">Files</h3>
              <div className={`
                ${viewMode === 'grid' 
                  ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4' 
                  : 'space-y-2'
                }
              `}>
                {filteredFiles.map((file) => (
                  <FileItem key={file.id} file={file} isGrid={viewMode === 'grid'} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {filteredFolders.length === 0 && filteredFiles.length === 0 && !searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Folder className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No files yet</h3>
            <p className="text-text-secondary mb-6">Upload your first file to get started</p>
            <Button variant="primary" onClick={onUpload}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </motion.div>
        )}
        
        {/* No Search Results */}
        {filteredFolders.length === 0 && filteredFiles.length === 0 && searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Search className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No results found</h3>
            <p className="text-text-secondary mb-6">Try adjusting your search terms</p>
          </motion.div>
        )}
      </div>

      {/* Move File Modal */}
      {showMoveModal && (
        <Modal isOpen onClose={() => setShowMoveModal(null)}>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Move File</h2>
            <p className="text-text-secondary mb-4">Select a destination folder:</p>
            
            <div className="max-h-64 overflow-y-auto mb-4">
              <button
                onClick={() => {}}
                className="w-full text-left p-3 rounded-lg hover:bg-dark-hover transition-colors border-dark-border border"
              >
                My Files (Root)
              </button>
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setShowMoveModal(null)}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={() => {
                  moveFileMutation.mutate({ fileId: showMoveModal, folderId: null });
                  setShowMoveModal(null);
                }}
              >
                Move Here
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        itemName={deleteModal.item?.name}
        itemType={deleteModal.type}
        isLoading={deleteFileMutation.isPending || deleteFolderMutation.isPending}
      />

    {/* Download Progress */}
    {Object.keys(downloadProgress).map(fileId => {
      const file = files.find(f => f.id === fileId);
      return file && downloadStatus[fileId] ? (
        <DownloadProgress
          key={fileId}
          progress={downloadProgress[fileId] || 0}
          status={downloadStatus[fileId]}
          filename={file.name}
        />
      ) : null;
    })}
  </div>
);
};

export default DragDropFileManager;