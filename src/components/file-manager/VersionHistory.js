import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { History, Download, RotateCcw, Calendar, User, HardDrive, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { filesService } from '../../services/files';

const VersionHistory = ({ fileId, isOpen, onClose }) => {
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const queryClient = useQueryClient();

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['file-versions', fileId],
    queryFn: () => filesService.getFileVersions(fileId),
    enabled: isOpen && !!fileId
  });

  const restoreMutation = useMutation({
    mutationFn: ({ fileId, versionId }) => filesService.restoreFileVersion(fileId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['file-versions', fileId]);
      queryClient.invalidateQueries(['files']);
      setShowRestoreModal(false);
      setSelectedVersion(null);
    }
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSize = (bytes) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleRestore = (version) => {
    setSelectedVersion(version);
    setShowRestoreModal(true);
  };

  const confirmRestore = () => {
    if (selectedVersion) {
      restoreMutation.mutate({
        fileId,
        versionId: selectedVersion.id
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-dark-surface1 border border-dark-border rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-dark-border">
            <div className="flex items-center space-x-3">
              <History className="w-5 h-5 text-accent-primary" />
              <h2 className="text-xl font-semibold text-text-primary">Version History</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>

          <div className="overflow-y-auto max-h-[60vh]">
            {isLoading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-dark-input rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-dark-input rounded w-1/3"></div>
                        <div className="h-3 bg-dark-input rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : versions.length === 0 ? (
              <div className="p-6 text-center">
                <History className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-muted">No version history available</p>
                <p className="text-sm text-text-muted mt-1">
                  Versions are created when files are updated
                </p>
              </div>
            ) : (
              <div className="divide-y divide-dark-border">
                {versions.map((version, index) => (
                  <motion.div
                    key={version.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-accent-primary/20 rounded-lg flex items-center justify-center">
                          <span className="text-accent-primary font-semibold">
                            v{version.version_number}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-4 text-sm text-text-muted">
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(version.created_at)}
                            </span>
                            <span className="flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              {version.created_by_name || 'Unknown'}
                            </span>
                            <span className="flex items-center">
                              <HardDrive className="w-3 h-3 mr-1" />
                              {formatSize(version.size_bytes)}
                            </span>
                          </div>
                          {index === 0 && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-accent-success/10 text-accent-success">
                                Current Version
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {index > 0 && (
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(version)}
                            disabled={restoreMutation.isLoading}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restore
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-dark-border bg-dark-surface2">
            <div className="flex items-start space-x-3 text-sm text-text-muted">
              <AlertTriangle className="w-4 h-4 text-accent-warning mt-0.5" />
              <div>
                <p className="font-medium text-accent-warning">Version Retention Policy</p>
                <p>Only the last 10 versions are kept. Older versions are automatically pruned to manage storage.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        title="Restore Version"
      >
        <div className="space-y-4">
          <div className="bg-accent-warning/10 border border-accent-warning/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-accent-warning mt-0.5" />
              <div>
                <h3 className="font-medium text-accent-warning">Important</h3>
                <p className="text-sm text-text-secondary mt-1">
                  Restoring this version will:
                </p>
                <ul className="text-sm text-text-secondary mt-2 space-y-1">
                  <li>• Create a new version from the current file</li>
                  <li>• Replace the current content with version {selectedVersion?.version_number}</li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>
            </div>
          </div>

          {selectedVersion && (
            <div className="bg-dark-input rounded-lg p-4">
              <h4 className="text-text-primary font-medium mb-2">Version Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Version:</span>
                  <span className="text-text-primary">v{selectedVersion.version_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Created:</span>
                  <span className="text-text-primary">{formatDate(selectedVersion.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Size:</span>
                  <span className="text-text-primary">{formatSize(selectedVersion.size_bytes)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setShowRestoreModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={confirmRestore}
              disabled={restoreMutation.isLoading}
            >
              {restoreMutation.isLoading ? 'Restoring...' : 'Restore Version'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default VersionHistory;