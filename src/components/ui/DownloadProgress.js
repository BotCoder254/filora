import React from 'react';
import { Download, CheckCircle, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DownloadProgress = ({ progress, status, filename, onCancel }) => {
  if (status !== 'downloading' && status !== 'completed' && status !== 'error') {
    return null;
  }

  const getIcon = () => {
    switch (status) {
      case 'downloading':
        return <Download className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Download className="w-4 h-4" />;
    }
  };

  const getMessage = () => {
    switch (status) {
      case 'downloading':
        return `Downloading ${filename}... ${progress}%`;
      case 'completed':
        return `Downloaded ${filename} successfully`;
      case 'error':
        return `Failed to download ${filename}`;
      default:
        return `Downloading ${filename}...`;
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case 'downloading':
        return 'bg-accent-primary';
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-accent-primary';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-4 right-4 bg-dark-surface1 border border-dark-border rounded-lg p-4 shadow-lg z-50 min-w-[300px]"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {getIcon()}
            <span className="text-sm text-text-primary font-medium">
              {status === 'downloading' ? 'Downloading' : 
               status === 'completed' ? 'Complete' : 'Failed'}
            </span>
          </div>
          {(status === 'downloading' || status === 'error') && onCancel && (
            <button
              onClick={onCancel}
              className="p-1 text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="mb-2">
          <p className="text-sm text-text-secondary truncate">{getMessage()}</p>
        </div>
        
        {status === 'downloading' && (
          <div className="relative">
            <div className="w-full bg-dark-surface2 rounded-full h-2">
              <motion.div
                className={`h-2 rounded-full ${getProgressColor()}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-text-muted">{progress}%</span>
              <span className="text-xs text-text-muted">
                {status === 'downloading' ? 'In progress' : 'Complete'}
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default DownloadProgress;