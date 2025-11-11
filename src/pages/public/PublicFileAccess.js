import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, Eye, Lock, AlertCircle, 
  FileText, Image, Video, Music, File as FileIcon
} from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import FileThumbnail from '../../components/file-manager/FileThumbnail';
import FilePreviewOverlay from '../../components/file-manager/FilePreviewOverlay';
import api from '../../services/api';
import { formatFileSize, formatDate } from '../../utils/helpers';

const PublicFileAccess = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadFileData();
  }, [token]);

  const loadFileData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (password) params.append('password', password);
      
      const response = await api.get(`/share/${token}/?${params}`);
      setFileData(response.data);
      setRequiresPassword(false);
    } catch (err) {
      if (err.response?.status === 401 && err.response?.data?.requires_password) {
        setRequiresPassword(true);
        setError('This file is password protected');
      } else if (err.response?.status === 410) {
        setError('This share link has expired');
      } else if (err.response?.status === 404) {
        setError('File not found or share link is invalid');
      } else {
        setError('Failed to load file');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password.trim()) {
      loadFileData();
    }
  };

  const handleDownload = () => {
    if (fileData?.download_url) {
      window.open(fileData.download_url, '_blank');
    }
  };

  const getFileIcon = (mimeType, size = 'w-16 h-16') => {
    if (mimeType?.startsWith('image/')) return <Image className={`${size} text-accent-secondary`} />;
    if (mimeType?.startsWith('video/')) return <Video className={`${size} text-accent-warning`} />;
    if (mimeType?.startsWith('audio/')) return <Music className={`${size} text-green-400`} />;
    if (mimeType === 'application/pdf') return <FileText className={`${size} text-red-400`} />;
    return <FileIcon className={`${size} text-text-muted`} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary"></div>
      </div>
    );
  }

  if (error && !requiresPassword) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-dark-card rounded-lg p-8 text-center"
          >
            <AlertCircle className="w-16 h-16 text-accent-error mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-text-primary mb-2">Access Denied</h1>
            <p className="text-text-secondary mb-6">{error}</p>
            <Button variant="primary" onClick={() => window.location.href = '/'}>
              Go to Filora
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-dark-card rounded-lg p-8"
          >
            <div className="text-center mb-6">
              <Lock className="w-16 h-16 text-accent-primary mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-text-primary mb-2">Password Required</h1>
              <p className="text-text-secondary">This file is password protected</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-dark-input border border-dark-border rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  autoFocus
                />
              </div>
              
              {error && (
                <p className="text-accent-error text-sm">{error}</p>
              )}
              
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={!password.trim()}
              >
                Access File
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!fileData) {
    return null;
  }

  const { file, permission, preview_url, download_url, thumbnail_urls } = fileData;

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <div className="bg-dark-card border-b border-dark-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold text-text-primary">Filora</h1>
              <span className="text-text-muted">•</span>
              <span className="text-text-secondary">Shared File</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {file.can_preview && preview_url && (
                <Button
                  variant="secondary"
                  onClick={() => setShowPreview(true)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              )}
              
              {download_url && permission !== 'viewer' && (
                <Button
                  variant="primary"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* File Info */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-dark-card rounded-lg p-8"
        >
          <div className="flex flex-col md:flex-row md:items-start space-y-6 md:space-y-0 md:space-x-8">
            {/* File Thumbnail/Icon */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 bg-dark-surface1 rounded-lg flex items-center justify-center">
                {thumbnail_urls?.medium ? (
                  <img
                    src={thumbnail_urls.medium}
                    alt={file.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  getFileIcon(file.mime_type, 'w-20 h-20')
                )}
              </div>
            </div>

            {/* File Details */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">{file.name}</h2>
                <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                  <span>{file.mime_type}</span>
                  <span>•</span>
                  <span>{formatFileSize(file.size_bytes)}</span>
                  {file.duration && (
                    <>
                      <span>•</span>
                      <span>{Math.floor(file.duration / 60)}:{Math.floor(file.duration % 60).toString().padStart(2, '0')}</span>
                    </>
                  )}
                  {file.page_count && (
                    <>
                      <span>•</span>
                      <span>{file.page_count} pages</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  permission === 'editor' 
                    ? 'bg-accent-warning bg-opacity-20 text-accent-warning'
                    : 'bg-accent-secondary bg-opacity-20 text-accent-secondary'
                }`}>
                  {permission === 'editor' ? 'Can Edit' : 'View Only'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                {file.can_preview && preview_url && (
                  <Button
                    variant="primary"
                    onClick={() => setShowPreview(true)}
                    className="flex-1 sm:flex-none"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview File
                  </Button>
                )}
                
                {download_url && (
                  <Button
                    variant="secondary"
                    onClick={handleDownload}
                    className="flex-1 sm:flex-none"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* File Preview Overlay */}
      <FilePreviewOverlay
        fileId={file.id}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
};

export default PublicFileAccess;