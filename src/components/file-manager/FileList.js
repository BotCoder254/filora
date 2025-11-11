import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText,
  Image,
  Video,
  Folder,
  MoreHorizontal,
  Check,
  Download,
  Share2,
  Trash2,
  Info,
  Eye
} from 'lucide-react';
import { formatFileSize, formatDate } from '../../utils/helpers';
import { useDownload } from '../../hooks/useDownload';
import Button from '../ui/Button';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';
import DownloadProgress from '../ui/DownloadProgress';
import FileThumbnail from './FileThumbnail';
import FilePreviewOverlay from './FilePreviewOverlay';
import ShareModal from './ShareModal';

const FileList = ({ 
  files, 
  folders, 
  selectedItems, 
  onItemSelect, 
  onItemClick,
  onFolderNavigate,
  draggedItem,
  dropTarget,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDeleteFile,
  onDeleteFolder
}) => {
  const [previewFile, setPreviewFile] = useState(null);
  const [shareFile, setShareFile] = useState(null);
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: null, // 'file' or 'folder'
    item: null
  });
  
  const { downloadFile, downloadProgress, downloadStatus } = useDownload();

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
      onDeleteFile(deleteModal.item.id, deleteModal.item.name);
    } else if (deleteModal.type === 'folder') {
      onDeleteFolder(deleteModal.item.id, deleteModal.item.name);
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
  const getFileIcon = (mimeType, size = 'w-5 h-5') => {
    if (mimeType?.startsWith('image/')) return <Image className={`${size} text-accent-secondary`} />;
    if (mimeType?.startsWith('video/')) return <Video className={`${size} text-accent-warning`} />;
    return <FileText className={`${size} text-accent-primary`} />;
  };

  const FileRow = ({ file }) => {
    const isSelected = selectedItems.includes(file.id);
    const isDragging = draggedItem?.id === file.id && draggedItem?.type === 'file';
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ 
          opacity: isDragging ? 0.5 : 1, 
          x: 0 
        }}
        exit={{ opacity: 0, x: -20 }}
        whileHover={{ backgroundColor: 'rgba(42, 42, 42, 0.5)' }}
        draggable
        onDragStart={(e) => onDragStart(e, file, 'file')}
        className={`
          flex items-center space-x-4 p-4 rounded-lg border transition-all cursor-pointer
          ${isSelected ? 'border-accent-primary bg-accent-primary/10' : 'border-transparent hover:bg-dark-hover'}
          ${isDragging ? 'opacity-50' : ''}
        `}
      >
        {/* Selection Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onItemSelect(file.id, 'file');
          }}
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0
            ${isSelected 
              ? 'bg-accent-primary border-accent-primary text-white' 
              : 'border-dark-border hover:border-accent-primary'
            }
          `}
        >
          {isSelected && <Check className="w-3 h-3" />}
        </button>

        {/* File Thumbnail */}
        <div className="flex-shrink-0">
          <FileThumbnail
            file={file}
            size="small"
            className="w-10 h-10"
            onClick={() => {
              if (file.mime_type.startsWith('image/') || file.mime_type.startsWith('video/') || file.mime_type.startsWith('audio/') || file.mime_type === 'application/pdf') {
                setPreviewFile(file.id);
              } else {
                onItemClick(file.id, 'file');
              }
            }}
          />
        </div>

        {/* File Info */}
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onItemClick(file.id, 'file')}
        >
          <div className="flex items-center space-x-2">
            <p className="text-text-primary font-medium truncate">{file.name}</p>
            {file.status === 'processing' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent-warning text-white">
                Processing
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4 text-sm text-text-muted mt-1">
            <span>{formatFileSize(file.size_bytes)}</span>
            <span>•</span>
            <span>{formatDate(file.modified_at)}</span>
            {file.download_count > 0 && (
              <>
                <span>•</span>
                <span>{file.download_count} downloads</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          {(file.mime_type.startsWith('image/') || file.mime_type.startsWith('video/') || file.mime_type.startsWith('audio/') || file.mime_type === 'application/pdf') && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewFile(file.id);
              }}
              title="Preview"
            >
              <Eye className="w-4 h-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onItemClick(file.id, 'file');
            }}
            title="Details"
          >
            <Info className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            title="Download"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(file);
            }}
            loading={downloadStatus[file.id] === 'downloading'}
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              setShareFile(file.id);
            }}
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteFile(file);
            }}
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-accent-error" />
          </Button>
        </div>
      </motion.div>
    );
  };

  const FolderRow = ({ folder }) => {
    const isSelected = selectedItems.includes(folder.id);
    const isDropTarget = dropTarget === folder.id;
    const isDragging = draggedItem?.id === folder.id && draggedItem?.type === 'folder';
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ 
          opacity: isDragging ? 0.5 : 1, 
          x: 0,
          scale: isDropTarget ? 1.02 : 1
        }}
        exit={{ opacity: 0, x: -20 }}
        whileHover={{ backgroundColor: 'rgba(42, 42, 42, 0.5)' }}
        onDragOver={(e) => onDragOver(e, folder.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, folder.id)}
        className={`
          flex items-center space-x-4 p-4 rounded-lg border transition-all cursor-pointer
          ${isSelected ? 'border-accent-primary bg-accent-primary/10' : 'border-transparent hover:bg-dark-hover'}
          ${isDropTarget ? 'border-accent-secondary bg-accent-secondary/10 shadow-lg' : ''}
          ${isDragging ? 'opacity-50' : ''}
        `}
      >
        {/* Selection Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onItemSelect(folder.id, 'folder');
          }}
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0
            ${isSelected 
              ? 'bg-accent-primary border-accent-primary text-white' 
              : 'border-dark-border hover:border-accent-primary'
            }
          `}
        >
          {isSelected && <Check className="w-3 h-3" />}
        </button>

        {/* Folder Icon */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-dark-surface2 rounded-lg flex items-center justify-center">
            <Folder className={`w-5 h-5 ${isDropTarget ? 'text-accent-secondary' : 'text-accent-secondary'}`} />
          </div>
        </div>

        {/* Folder Info */}
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onFolderNavigate(folder.id)}
        >
          <p className="text-text-primary font-medium truncate">{folder.name}</p>
          <div className="flex items-center space-x-4 text-sm text-text-muted mt-1">
            <span>{folder.files_count || 0} files</span>
            <span>•</span>
            <span>{formatDate(folder.created_at)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1 flex-shrink-0">
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
      </motion.div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Folders List */}
      <AnimatePresence>
        {folders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-1"
          >
            {folders.map((folder) => (
              <FolderRow key={folder.id} folder={folder} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Files List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-1"
          >
            {files.map((file) => (
              <FileRow key={file.id} file={file} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* File Preview Overlay */}
      <FilePreviewOverlay
        fileId={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />
      
      {/* Share Modal */}
      <ShareModal
        fileId={shareFile}
        isOpen={!!shareFile}
        onClose={() => setShareFile(null)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        itemName={deleteModal.item?.name}
        itemType={deleteModal.type}
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

export default FileList;