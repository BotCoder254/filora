import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Download, Maximize2, Share2, ExternalLink, 
  Play, Pause, Volume2, VolumeX, RotateCcw, ZoomIn, ZoomOut
} from 'lucide-react';
import ReactPlayer from 'react-player';
import Button from '../ui/Button';
import api from '../../services/api';

const FilePreviewOverlay = ({ fileId, isOpen, onClose }) => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);

  useEffect(() => {
    if (isOpen && fileId) {
      loadPreviewData();
    }
  }, [isOpen, fileId]);

  const loadPreviewData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get file details
      const fileResponse = await api.get(`/files/${fileId}/`);
      setFile(fileResponse.data);
      
      // Get preview data
      const previewResponse = await api.get(`/files/${fileId}/preview/`);
      setPreviewData(previewResponse.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await api.get(`/files/${fileId}/download/`);
      window.open(response.data.download_url, '_blank');
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleShare = () => {
    // Implement share functionality
    console.log('Share file:', fileId);
  };

  const handleOpenInNewTab = () => {
    if (previewData?.preview_url) {
      window.open(previewData.preview_url, '_blank');
    }
  };

  const handleZoomIn = () => {
    setImageZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setImageZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const resetZoom = () => {
    setImageZoom(1);
  };

  const renderPreviewContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <div className="text-red-400 text-lg">Preview failed</div>
          <div className="text-text-secondary text-sm">{error}</div>
          <Button variant="primary" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download File
          </Button>
        </div>
      );
    }

    if (!file || !previewData) return null;

    // Image preview
    if (file.mime_type.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-full overflow-hidden">
          <motion.img
            src={previewData.preview_url}
            alt={file.name}
            className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing"
            style={{ transform: `scale(${imageZoom})` }}
            drag
            dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
            whileDrag={{ cursor: 'grabbing' }}
          />
        </div>
      );
    }

    // Video/Audio preview
    if (file.mime_type.startsWith('video/') || file.mime_type.startsWith('audio/')) {
      return (
        <div className="flex items-center justify-center h-full">
          <ReactPlayer
            url={previewData.preview_url}
            playing={isPlaying}
            muted={isMuted}
            volume={volume}
            controls={true}
            width="100%"
            height="100%"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>
      );
    }

    // PDF preview
    if (file.mime_type === 'application/pdf') {
      return (
        <div className="h-full">
          <iframe
            src={previewData.preview_url}
            className="w-full h-full border-0"
            title={file.name}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="text-text-secondary">Preview not available for this file type</div>
        <Button variant="primary" onClick={handleDownload}>
          <Download className="w-4 h-4 mr-2" />
          Download File
        </Button>
      </div>
    );
  };

  const renderToolbar = () => {
    if (!file) return null;

    return (
      <div className="flex items-center justify-between p-4 bg-dark-card border-b border-dark-border">
        <div className="flex items-center space-x-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary truncate max-w-xs">
              {file.name}
            </h3>
            <div className="text-sm text-text-secondary">
              {file.mime_type} • {(file.size_bytes / 1024 / 1024).toFixed(2)} MB
              {file.duration && ` • ${Math.floor(file.duration / 60)}:${Math.floor(file.duration % 60).toString().padStart(2, '0')}`}
              {file.page_count && ` • ${file.page_count} pages`}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Image controls */}
          {file.mime_type.startsWith('image/') && (
            <>
              <Button variant="ghost" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={resetZoom}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </>
          )}

          {/* Media controls */}
          {(file.mime_type.startsWith('video/') || file.mime_type.startsWith('audio/')) && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </>
          )}

          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleOpenInNewTab}>
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.open(previewData?.preview_url, '_blank')}>
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          {/* Mobile: Full screen with top controls */}
          <div className="md:hidden flex flex-col h-full">
            {renderToolbar()}
            <div className="flex-1 relative">
              {renderPreviewContent()}
            </div>
          </div>

          {/* Desktop: Centered with margins */}
          <div className="hidden md:flex flex-col h-full max-w-6xl mx-auto my-8 bg-dark-card rounded-lg overflow-hidden">
            {renderToolbar()}
            <div className="flex-1 relative">
              {renderPreviewContent()}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FilePreviewOverlay;