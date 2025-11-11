import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity, Filter, FileText, Folder, Share, Key, Webhook, Calendar, User } from 'lucide-react';
import Button from '../ui/Button';
import { filesService } from '../../services/files';

const ActivityLog = ({ fileId = null, isOpen, onClose }) => {
  const [filter, setFilter] = useState('all');

  const { data: activities = [], isLoading } = useQuery({
    queryKey: fileId ? ['file-activity', fileId] : ['user-activity', filter],
    queryFn: () => fileId 
      ? filesService.getFileActivity(fileId)
      : filesService.getUserActivity(filter !== 'all' ? { type: filter } : {}),
    enabled: isOpen
  });

  const getActionIcon = (objectType, action) => {
    if (objectType === 'file') return <FileText className="w-4 h-4" />;
    if (objectType === 'folder') return <Folder className="w-4 h-4" />;
    if (objectType === 'share') return <Share className="w-4 h-4" />;
    if (objectType === 'token') return <Key className="w-4 h-4" />;
    if (objectType === 'webhook') return <Webhook className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'created': return 'text-accent-success';
      case 'deleted': return 'text-accent-error';
      case 'updated': return 'text-accent-primary';
      case 'shared': return 'text-accent-secondary';
      case 'restored': return 'text-accent-warning';
      default: return 'text-text-muted';
    }
  };

  const formatAction = (activity) => {
    const { action, object_type, metadata } = activity;
    const objectName = metadata.file_name || metadata.folder_name || activity.object_name;
    
    switch (action) {
      case 'created':
        return `Created ${object_type} "${objectName}"`;
      case 'deleted':
        return `Deleted ${object_type} "${objectName}"`;
      case 'updated':
        return `Updated ${object_type} "${objectName}"`;
      case 'shared':
        return `Shared ${object_type} "${objectName}"`;
      case 'restored':
        return `Restored ${object_type} "${objectName}" to version ${metadata.restored_from_version}`;
      case 'version_created':
        return `Created version ${metadata.version} of "${objectName}"`;
      case 'renamed':
        return `Renamed "${metadata.old_name}" to "${metadata.new_name}"`;
      case 'moved':
        return `Moved "${objectName}" from ${metadata.old_folder} to ${metadata.new_folder}`;
      case 'downloaded':
        return `Downloaded "${objectName}"`;
      default:
        return `${action} ${object_type} "${objectName}"`;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filterOptions = [
    { value: 'all', label: 'All Activity' },
    { value: 'file', label: 'Files' },
    { value: 'folder', label: 'Folders' },
    { value: 'share', label: 'Shares' },
    { value: 'token', label: 'API Tokens' },
    { value: 'webhook', label: 'Webhooks' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-dark-surface1 border border-dark-border rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <div className="flex items-center space-x-3">
            <Activity className="w-5 h-5 text-accent-primary" />
            <h2 className="text-xl font-semibold text-text-primary">
              {fileId ? 'File Activity' : 'Activity Log'}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        {!fileId && (
          <div className="p-4 border-b border-dark-border">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-text-muted" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-dark-input border border-dark-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                {filterOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-dark-input rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-dark-input rounded w-3/4"></div>
                      <div className="h-3 bg-dark-input rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-6 text-center">
              <Activity className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted">No activity found</p>
              <p className="text-sm text-text-muted mt-1">
                Activity will appear here as you use the platform
              </p>
            </div>
          ) : (
            <div className="divide-y divide-dark-border">
              {activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(activity.action)} bg-current/10`}>
                      {getActionIcon(activity.object_type, activity.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary font-medium">
                        {formatAction(activity)}
                      </p>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-text-muted">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {activity.user_name || activity.user_email}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(activity.timestamp)}
                        </span>
                      </div>
                      
                      {/* Additional metadata */}
                      {activity.metadata && Object.keys(activity.metadata).length > 1 && (
                        <div className="mt-2 text-xs text-text-muted">
                          {activity.metadata.file_size && (
                            <span className="mr-3">
                              Size: {Math.round(activity.metadata.file_size / 1024)} KB
                            </span>
                          )}
                          {activity.metadata.mime_type && (
                            <span>Type: {activity.metadata.mime_type}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ActivityLog;