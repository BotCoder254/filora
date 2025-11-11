import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { 
  Download, ExternalLink, AlertCircle,
  FileText, Image, Video, Music, File as FileIcon
} from 'lucide-react';
import Button from '../../components/ui/Button';
import api from '../../services/api';
import { formatFileSize } from '../../utils/helpers';

const EmbedFileView = () => {
  const { token } = useParams();
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFileData();
  }, [token]);

  const loadFileData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/share/${token}/`);
      setFileData(response.data);
    } catch (err) {
      if (err.response?.status === 410) {
        setError('This embed link has expired');
      } else if (err.response?.status === 404) {
        setError('File not found or embed link is invalid');
      } else {
        setError('Failed to load file');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (fileData?.download_url) {
      window.open(fileData.download_url, '_blank');
    }
  };

  const handleOpenOriginal = () => {
    window.open(`/share/${token}`, '_blank');
  };

  const getFileIcon = (mimeType, size = 'w-12 h-12') => {
    if (mimeType?.startsWith('image/')) return <Image className={`${size} text-accent-secondary`} />;
    if (mimeType?.startsWith('video/')) return <Video className={`${size} text-accent-warning`} />;
    if (mimeType?.startsWith('audio/')) return <Music className={`${size} text-green-400`} />;
    if (mimeType === 'application/pdf') return <FileText className={`${size} text-red-400`} />;
    return <FileIcon className={`${size} text-text-muted`} />;
  };

  const renderFileContent = () => {
    if (!fileData) return null;

    const { file, preview_url, thumbnail_urls } = fileData;

    // Image preview
    if (file.mime_type?.startsWith('image/')) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <img
            src={preview_url || thumbnail_urls?.large}
            alt={file.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }

    // Video/Audio preview
    if (file.mime_type?.startsWith('video/') || file.mime_type?.startsWith('audio/')) {
      return (
        <div className="w-full h-full bg-black">
          <ReactPlayer
            url={preview_url}
            controls={true}
            width="100%"
            height="100%"
            style={{ backgroundColor: 'black' }}
          />
        </div>
      );
    }

    // PDF preview
    if (file.mime_type === 'application/pdf') {
      return (
        <div className="w-full h-full">
          <iframe
            src={preview_url}
            className="w-full h-full border-0"
            title={file.name}
          />
        </div>
      );
    }

    // Fallback for other file types
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-dark-surface1 text-center p-8">
        {getFileIcon(file.mime_type, 'w-16 h-16')}
        <h3 className="text-lg font-semibold text-text-primary mt-4 mb-2">{file.name}</h3>
        <p className="text-text-secondary mb-4">
          {file.mime_type} • {formatFileSize(file.size_bytes)}
        </p>
        <div className="flex space-x-2">
          <Button variant="primary" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="secondary" onClick={handleOpenOriginal}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-accent-error mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-text-primary mb-2">Embed Error</h1>
          <p className="text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-dark-bg flex flex-col">
      {/* Minimal Header */}
      <div className="bg-dark-card border-b border-dark-border px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-text-primary">Filora</span>
          <span className="text-text-muted">•</span>
          <span className="text-sm text-text-secondary truncate max-w-xs">
            {fileData?.file?.name}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {fileData?.download_url && (
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleOpenOriginal}>
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* File Content */}
      <div className="flex-1 overflow-hidden">
        {renderFileContent()}
      </div>
    </div>
  );
};

export default EmbedFileView;