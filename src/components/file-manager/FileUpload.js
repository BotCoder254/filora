import React, { useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, CheckCircle, AlertCircle, Pause, Play, RotateCcw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { uploadService } from '../../services/upload';
import { formatFileSize } from '../../utils/helpers';
import Button from '../ui/Button';

const FileUpload = ({ folderId, onClose, onSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList).map(file => {
      // Client-side validation
      const errors = [];
      if (file.size > 50 * 1024 * 1024) {
        errors.push('File size exceeds 50MB limit');
      }
      
      return {
        file,
        id: `${Date.now()}-${Math.random()}`,
        status: errors.length > 0 ? 'error' : 'pending',
        progress: 0,
        uploadedChunks: 0,
        totalChunks: 0,
        error: errors.join(', ') || null,
        uploadId: null
      };
    });
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId) => {
    const fileItem = files.find(f => f.id === fileId);
    if (fileItem && fileItem.uploadId && fileItem.status === 'uploading') {
      uploadService.cancelUpload(fileItem.uploadId);
    }
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const retryFile = async (fileId) => {
    const fileItem = files.find(f => f.id === fileId);
    if (!fileItem) return;
    
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'pending', error: null, progress: 0 } : f
    ));
    
    await uploadSingleFile(fileItem);
  };

  const uploadSingleFile = async (fileItem) => {
    try {
      const result = await uploadService.uploadFileChunked(
        fileItem.file,
        folderId,
        (progressData) => {
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id ? {
              ...f,
              ...progressData,
              uploadId: progressData.uploadId || f.uploadId
            } : f
          ));
          
          // Invalidate cache when upload completes for real-time updates
          if (progressData.status === 'completed') {
            queryClient.invalidateQueries({ queryKey: ['files', folderId] });
            queryClient.invalidateQueries({ queryKey: ['uploads'] }); // Update uploads/recent uploads
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
          }
        }
      );
      
      return result;
    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? {
          ...f,
          status: 'failed',
          error: error.message
        } : f
      ));
      throw error;
    }
  };

  const uploadFiles = async () => {
    setUploading(true);
    const pendingFiles = Array.isArray(files) ? files.filter(f => f.status === 'pending') : [];
    
    try {
      await Promise.all(pendingFiles.map(uploadSingleFile));
      if (onSuccess) onSuccess();
    } finally {
      setUploading(false);
    }
  };

  const retryAllFailed = async () => {
    const failedFiles = Array.isArray(files) ? files.filter(f => f.status === 'failed' || f.status === 'error') : [];
    for (const fileItem of failedFiles) {
      await retryFile(fileItem.id);
    }
  };

  const getStatusIcon = (fileItem) => {
    switch (fileItem.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-accent-success" />;
      case 'failed':
      case 'error':
        return <AlertCircle className="w-5 h-5 text-accent-error" />;
      case 'uploading':
        return <Upload className="w-5 h-5 text-accent-primary animate-pulse" />;
      case 'processing':
        return <Upload className="w-5 h-5 text-accent-warning animate-spin" />;
      default:
        return <Upload className="w-5 h-5 text-text-muted" />;
    }
  };

  const getOverallProgress = () => {
    if (files.length === 0) return 0;
    const totalProgress = files.reduce((sum, file) => sum + (file.progress || 0), 0);
    return totalProgress / files.length;
  };

  const hasFailedFiles = Array.isArray(files) ? files.some(f => f.status === 'failed' || f.status === 'error') : false;
  const hasPendingFiles = Array.isArray(files) ? files.some(f => f.status === 'pending') : false;

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-colors
          ${dragActive 
            ? 'border-accent-primary bg-accent-primary/10' 
            : 'border-dark-border hover:border-accent-primary/50'
          }
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Drop files here or click to browse
        </h3>
        <p className="text-text-secondary mb-4">
          Support for multiple files up to 50MB each
        </p>
        <input
          type="file"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button variant="secondary" className="cursor-pointer">
            Browse Files
          </Button>
        </label>
      </div>

      {/* Overall Progress */}
      {uploading && files.length > 0 && (
        <div className="bg-dark-surface1 rounded-lg p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-text-secondary">Overall Progress</span>
            <span className="text-text-primary">{Math.round(getOverallProgress())}%</span>
          </div>
          <div className="w-full bg-dark-border rounded-full h-2">
            <motion.div
              className="bg-accent-primary h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${getOverallProgress()}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-text-primary font-medium">Files ({files.length})</h4>
              {hasFailedFiles && (
                <Button variant="ghost" size="sm" onClick={retryAllFailed}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Retry Failed
                </Button>
              )}
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {files.map((fileItem) => (
                <motion.div
                  key={fileItem.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-dark-surface1 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(fileItem)}
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary font-medium truncate">
                          {fileItem.file.name}
                        </p>
                        <p className="text-text-muted text-sm">
                          {formatFileSize(fileItem.file.size)}
                          {fileItem.totalChunks > 0 && (
                            <span className="ml-2">
                              {fileItem.uploadedChunks}/{fileItem.totalChunks} chunks
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {(fileItem.status === 'failed' || fileItem.status === 'error') && (
                        <Button variant="ghost" size="sm" onClick={() => retryFile(fileItem.id)}>
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                      {(fileItem.status === 'pending' || fileItem.status === 'failed' || fileItem.status === 'error') && (
                        <button
                          onClick={() => removeFile(fileItem.id)}
                          className="p-1 hover:bg-dark-hover rounded"
                        >
                          <X className="w-4 h-4 text-text-muted" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  {(fileItem.status === 'uploading' || fileItem.status === 'processing') && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-secondary capitalize">{fileItem.status}</span>
                        <span className="text-text-primary">{Math.round(fileItem.progress || 0)}%</span>
                      </div>
                      <div className="w-full bg-dark-border rounded-full h-1.5">
                        <motion.div
                          className="bg-accent-primary h-1.5 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${fileItem.progress || 0}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {fileItem.error && (
                    <p className="text-accent-error text-xs mt-2">{fileItem.error}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={uploadFiles}
          disabled={!hasPendingFiles}
          loading={uploading}
        >
          Upload {Array.isArray(files) ? files.filter(f => f.status === 'pending').length : 0} Files
        </Button>
      </div>
    </div>
  );
};

export default FileUpload;