import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText,
  Image,
  Video,
  Folder,
  MoreHorizontal,
  Check,
  Eye,
  Share2
} from 'lucide-react';
import { formatFileSize, formatDate } from '../../utils/helpers';
import FileThumbnail from './FileThumbnail';
import FilePreviewOverlay from './FilePreviewOverlay';
import ShareModal from './ShareModal';

const FileGrid = ({ 
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
  onDrop
}) => {
  const [previewFile, setPreviewFile] = useState(null);
  const [shareFile, setShareFile] = useState(null);
  const getFileIcon = (mimeType, size = 'w-8 h-8') => {
    if (mimeType?.startsWith('image/')) return <Image className={`${size} text-accent-secondary`} />;
    if (mimeType?.startsWith('video/')) return <Video className={`${size} text-accent-warning`} />;
    return <FileText className={`${size} text-accent-primary`} />;
  };

  const FileCard = ({ file }) => {
    const isSelected = selectedItems.includes(file.id);
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
        whileHover={{ scale: 1.02 }}
        draggable
        onDragStart={(e) => onDragStart(e, file, 'file')}
        className={`
          relative bg-dark-surface1 border rounded-xl p-4 cursor-pointer transition-all
          aspect-square flex flex-col
          ${isSelected ? 'border-accent-primary bg-accent-primary/10 shadow-lg' : 'border-dark-border hover:bg-dark-hover'}
          ${isDragging ? 'opacity-50' : ''}
        `}
      >
        {/* Selection Checkbox */}
        <div className="absolute top-3 left-3 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onItemSelect(file.id, 'file');
            }}
            className={`
              w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
              ${isSelected 
                ? 'bg-accent-primary border-accent-primary text-white' 
                : 'border-dark-border hover:border-accent-primary bg-dark-surface1'
              }
            `}
          >
            {isSelected && <Check className="w-3 h-3" />}
          </button>
        </div>

        {/* More Options */}
        <div className="absolute top-3 right-3 z-10">
          <button className="p-1 hover:bg-dark-hover rounded-lg transition-colors">
            <MoreHorizontal className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        {/* File Thumbnail */}
        <div className="flex-1 flex items-center justify-center mb-3 group">
          <FileThumbnail
            file={file}
            size="large"
            onClick={() => {
              if (file.mime_type.startsWith('image/') || file.mime_type.startsWith('video/') || file.mime_type.startsWith('audio/') || file.mime_type === 'application/pdf') {
                setPreviewFile(file.id);
              } else {
                onItemClick(file.id, 'file');
              }
            }}
            showRegenerateButton={true}
          />
          
          {/* Preview Button Overlay */}
          {(file.mime_type.startsWith('image/') || file.mime_type.startsWith('video/') || file.mime_type.startsWith('audio/') || file.mime_type === 'application/pdf') && (
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewFile(file.id);
                  }}
                  className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                >
                  <Eye className="w-4 h-4 text-gray-800" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShareFile(file.id);
                  }}
                  className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                >
                  <Share2 className="w-4 h-4 text-gray-800" />
                </button>
              </div>
            </div>
          )}
          
          {/* Processing Badge */}
          {file.status === 'processing' && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent-warning text-white">
                Processing
              </span>
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="space-y-1">
          <p className="text-text-primary font-medium truncate text-sm" title={file.name}>
            {file.name}
          </p>
          <p className="text-text-muted text-xs">
            {formatFileSize(file.size_bytes)}
          </p>
          <p className="text-text-muted text-xs">
            {formatDate(file.modified_at)}
          </p>
        </div>
      </motion.div>
    );
  };

  const FolderCard = ({ folder }) => {
    const isSelected = selectedItems.includes(folder.id);
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
        whileHover={{ scale: 1.02 }}
        onDragOver={(e) => onDragOver(e, folder.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, folder.id)}
        className={`
          relative bg-dark-surface1 border rounded-xl p-4 cursor-pointer transition-all
          aspect-square flex flex-col
          ${isSelected ? 'border-accent-primary bg-accent-primary/10 shadow-lg' : 'border-dark-border hover:bg-dark-hover'}
          ${isDropTarget ? 'border-accent-secondary bg-accent-secondary/10 shadow-lg' : ''}
          ${isDragging ? 'opacity-50' : ''}
        `}
      >
        {/* Selection Checkbox */}
        <div className="absolute top-3 left-3 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onItemSelect(folder.id, 'folder');
            }}
            className={`
              w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
              ${isSelected 
                ? 'bg-accent-primary border-accent-primary text-white' 
                : 'border-dark-border hover:border-accent-primary bg-dark-surface1'
              }
            `}
          >
            {isSelected && <Check className="w-3 h-3" />}
          </button>
        </div>

        {/* More Options */}
        <div className="absolute top-3 right-3 z-10">
          <button className="p-1 hover:bg-dark-hover rounded-lg transition-colors">
            <MoreHorizontal className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        {/* Folder Icon */}
        <div 
          className="flex-1 flex items-center justify-center mb-3"
          onClick={() => onFolderNavigate(folder.id)}
        >
          <Folder className={`w-16 h-16 ${isDropTarget ? 'text-accent-secondary' : 'text-accent-secondary'}`} />
        </div>

        {/* Folder Info */}
        <div className="space-y-1">
          <p className="text-text-primary font-medium truncate text-sm" title={folder.name}>
            {folder.name}
          </p>
          <p className="text-text-muted text-xs">
            {folder.files_count || 0} files
          </p>
          <p className="text-text-muted text-xs">
            {formatDate(folder.created_at)}
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Folders Grid */}
      <AnimatePresence>
        {folders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="text-lg font-semibold text-text-primary mb-4">Folders</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {folders.map((folder) => (
                <FolderCard key={folder.id} folder={folder} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Files Grid */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="text-lg font-semibold text-text-primary mb-4">Files</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {files.map((file) => (
                <FileCard key={file.id} file={file} />
              ))}
            </div>
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
    </div>
  );
};

export default FileGrid;