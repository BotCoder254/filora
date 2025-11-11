import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Image, Video, Music, File as FileIcon, 
  Loader2, AlertCircle, RotateCcw 
} from 'lucide-react';
import api from '../../services/api';

const FileThumbnail = ({ 
  file, 
  size = 'medium', 
  className = '', 
  onClick,
  showRegenerateButton = false 
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadThumbnail();
  }, [file.id, size]);

  const loadThumbnail = async () => {
    try {
      setLoading(true);
      setError(false);
      
      const response = await api.get(`/files/${file.id}/thumbnail/?size=${size}`);
      setThumbnailUrl(response.data.thumbnail_url);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateThumbnail = async (e) => {
    e.stopPropagation();
    try {
      setRegenerating(true);
      await api.post(`/files/${file.id}/regenerate-thumbnail/`);
      // Reload thumbnail after regeneration
      setTimeout(() => {
        loadThumbnail();
        setRegenerating(false);
      }, 2000);
    } catch (err) {
      setRegenerating(false);
      console.error('Failed to regenerate thumbnail:', err);
    }
  };

  const getFileIcon = () => {
    if (file.mime_type.startsWith('image/')) {
      return <Image className="w-8 h-8 text-blue-400" />;
    }
    if (file.mime_type.startsWith('video/')) {
      return <Video className="w-8 h-8 text-purple-400" />;
    }
    if (file.mime_type.startsWith('audio/')) {
      return <Music className="w-8 h-8 text-green-400" />;
    }
    if (file.mime_type === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-400" />;
    }
    return <FileIcon className="w-8 h-8 text-text-muted" />;
  };

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
    large: 'w-24 h-24'
  };

  const containerClass = `${sizeClasses[size]} ${className} relative bg-dark-input rounded-lg overflow-hidden flex items-center justify-center cursor-pointer hover:bg-dark-hover transition-colors`;

  if (loading) {
    return (
      <div className={containerClass} onClick={onClick}>
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error || !thumbnailUrl) {
    return (
      <div className={containerClass} onClick={onClick}>
        <div className="flex flex-col items-center justify-center space-y-1">
          {getFileIcon()}
          {showRegenerateButton && (file.mime_type.startsWith('image/') || file.mime_type.startsWith('video/') || file.mime_type === 'application/pdf') && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleRegenerateThumbnail}
              disabled={regenerating}
              className="absolute top-1 right-1 p-1 bg-dark-card rounded-full hover:bg-dark-hover transition-colors"
              title="Regenerate thumbnail"
            >
              {regenerating ? (
                <Loader2 className="w-3 h-3 animate-spin text-text-muted" />
              ) : (
                <RotateCcw className="w-3 h-3 text-text-muted" />
              )}
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass} onClick={onClick}>
      <img
        src={thumbnailUrl}
        alt={file.name}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
      
      {/* File type indicator for videos/audio */}
      {(file.mime_type.startsWith('video/') || file.mime_type.startsWith('audio/')) && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          {file.mime_type.startsWith('video/') ? (
            <Video className="w-6 h-6 text-white" />
          ) : (
            <Music className="w-6 h-6 text-white" />
          )}
        </div>
      )}
      
      {/* Duration indicator for media files */}
      {file.duration && (
        <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black bg-opacity-70 rounded text-xs text-white">
          {Math.floor(file.duration / 60)}:{Math.floor(file.duration % 60).toString().padStart(2, '0')}
        </div>
      )}
      
      {/* Page count for PDFs */}
      {file.page_count && (
        <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black bg-opacity-70 rounded text-xs text-white">
          {file.page_count} pages
        </div>
      )}

      {showRegenerateButton && (file.mime_type.startsWith('image/') || file.mime_type.startsWith('video/') || file.mime_type === 'application/pdf') && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleRegenerateThumbnail}
          disabled={regenerating}
          className="absolute top-1 right-1 p-1 bg-dark-card rounded-full hover:bg-dark-hover transition-colors opacity-0 group-hover:opacity-100"
          title="Regenerate thumbnail"
        >
          {regenerating ? (
            <Loader2 className="w-3 h-3 animate-spin text-text-muted" />
          ) : (
            <RotateCcw className="w-3 h-3 text-text-muted" />
          )}
        </motion.button>
      )}
    </div>
  );
};

export default FileThumbnail;