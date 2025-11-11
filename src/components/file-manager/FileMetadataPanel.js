import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Edit2, 
  Check, 
  Download, 
  Share2, 
  Clock, 
  User, 
  FolderOpen,
  Eye,
  FileText,
  Image,
  Video,
  AlertCircle,
  History,
  Activity
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDownload } from '../../hooks/useDownload';
import DownloadProgress from '../ui/DownloadProgress';
import { formatFileSize, formatDate } from '../../utils/helpers';
import Button from '../ui/Button';
import Input from '../ui/Input';
import ShareModal from './ShareModal';
import VersionHistory from './VersionHistory';
import ActivityLog from './ActivityLog';
import api from '../../services/api';

const FileMetadataPanel = ({ fileId, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const queryClient = useQueryClient();
  const { downloadFile, downloadProgress, downloadStatus } = useDownload();

  const { data: file, isLoading, error } = useQuery({
    queryKey: ['file', fileId],
    queryFn: async () => {
      const response = await api.get(`/files/${fileId}/`);
      return response.data;
    },
    enabled: !!fileId
  });

  const renameMutation = useMutation({
    mutationFn: async (newName) => {
      const response = await api.post(`/files/${fileId}/rename/`, { new_name: newName });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['file', fileId] });
      setIsEditing(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/files/${fileId}/`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['file', fileId] });
      setIsEditing(false);
    }
  });

  const handleDownload = async () => {
    if (file) {
      try {
        await downloadFile(fileId, file.name);
      } catch (error) {
        console.error('Download failed:', error);
      }
    }
  };

  const handleStartEdit = () => {
    setEditName(file.name);
    setEditDescription(file.description || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editName !== file.name) {
      renameMutation.mutate(editName);
    } else if (editDescription !== file.description) {
      updateMutation.mutate({ description: editDescription });
    } else {
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName('');
    setEditDescription('');
  };

  const getFileIcon = (mimeType, size = 'w-8 h-8') => {
    if (mimeType?.startsWith('image/')) return <Image className={`${size} text-accent-secondary`} />;
    if (mimeType?.startsWith('video/')) return <Video className={`${size} text-accent-warning`} />;
    return <FileText className={`${size} text-accent-primary`} />;
  };

  const getStatusBadge = (status) => {
    const badges = {
      ready: { color: 'bg-accent-success', text: 'Ready' },
      processing: { color: 'bg-accent-warning', text: 'Processing' },
      uploading: { color: 'bg-accent-primary', text: 'Uploading' },
      error: { color: 'bg-accent-error', text: 'Error' },
      unavailable: { color: 'bg-text-muted', text: 'Unavailable' }
    };
    
    const badge = badges[status] || badges.ready;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="w-80 xl:w-96 bg-dark-surface1 border-l border-dark-border p-6">
        <div className="text-center py-12">
          <div className="text-text-muted">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="w-80 xl:w-96 bg-dark-surface1 border-l border-dark-border p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-accent-error mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">File Unavailable</h3>
          <p className="text-text-secondary mb-4">This file is temporarily unavailable</p>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      // Render as a fixed overlay on the right so it appears above the RightPanel
      className="fixed top-0 right-0 h-full w-80 xl:w-96 bg-dark-surface1 border-l border-dark-border flex flex-col z-50"
      style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
    >
      {/* Header */}
      <div className="p-6 border-b border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">File Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-dark-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
        
        {/* File Icon and Name */}
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            {getFileIcon(file.mime_type, 'w-12 h-12')}
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-lg font-semibold"
                />
                <div className="flex space-x-2">
                  <Button size="sm" onClick={handleSaveEdit} loading={renameMutation.isPending}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-text-primary truncate">{file.name}</h3>
                <button
                  onClick={handleStartEdit}
                  className="p-1 hover:bg-dark-hover rounded transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-text-muted" />
                </button>
              </div>
            )}
            <div className="flex items-center space-x-2 mt-1">
              {getStatusBadge(file.status)}
              {file.is_public && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent-secondary/20 text-accent-secondary">
                  Public
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-border">
        <div className="flex">
          {['details', 'versions', 'activity'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-accent-primary border-b-2 border-accent-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={handleDownload}
                  loading={downloadStatus[fileId] === 'downloading'}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setShowShareModal(true)}
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowVersionHistory(true)}
                >
                  <History className="w-4 h-4 mr-1" />
                  Versions
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowActivityLog(true)}
                >
                  <Activity className="w-4 h-4 mr-1" />
                  Activity
                </Button>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Description</label>
                {isEditing ? (
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-input border border-dark-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                    rows={3}
                    placeholder="Add a description..."
                  />
                ) : (
                  <p className="text-text-secondary text-sm">
                    {file.description || 'No description'}
                  </p>
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-text-muted">Size</span>
                    <p className="text-text-primary font-medium">{formatFileSize(file.size_bytes)}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Type</span>
                    <p className="text-text-primary font-medium">{file.mime_type}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Created</span>
                    <p className="text-text-primary font-medium">{formatDate(file.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Modified</span>
                    <p className="text-text-primary font-medium">{formatDate(file.modified_at)}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-dark-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted text-sm">Owner</span>
                    <span className="text-text-primary text-sm">{file.owner_name}</span>
                  </div>
                  {file.folder_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted text-sm">Folder</span>
                      <span className="text-text-primary text-sm">{file.folder_name}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted text-sm">Downloads</span>
                    <span className="text-text-primary text-sm">{file.download_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted text-sm">Version</span>
                    <span className="text-text-primary text-sm">v{file.version}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'versions' && (
            <motion.div
              key="versions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {file.versions && file.versions.length > 0 ? (
                file.versions.map((version) => (
                  <div key={version.id} className="p-3 bg-dark-surface2 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-text-primary">v{version.version_number}</span>
                      <span className="text-text-muted text-sm">{formatDate(version.created_at)}</span>
                    </div>
                    <div className="text-text-secondary text-sm">
                      <p>Size: {formatFileSize(version.size_bytes)}</p>
                      <p>By: {version.created_by_name}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <p className="text-text-muted">No version history</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {file.recent_activity && file.recent_activity.length > 0 ? (
                file.recent_activity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-accent-primary rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm">
                        <span className="font-medium">{activity.user_name}</span> {activity.action} the file
                      </p>
                      <p className="text-text-muted text-xs">{formatDate(activity.created_at)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <p className="text-text-muted">No recent activity</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Modals */}
      <ShareModal
        fileId={showShareModal ? fileId : null}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
      
      <VersionHistory
        fileId={fileId}
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
      />
      
      <ActivityLog
        fileId={fileId}
        isOpen={showActivityLog}
        onClose={() => setShowActivityLog(false)}
      />

      {/* Download Progress */}
      {file && (
        <DownloadProgress
          progress={downloadProgress[fileId] || 0}
          status={downloadStatus[fileId]}
          filename={file.name}
        />
      )}
    </motion.div>
  );
};

export default FileMetadataPanel;