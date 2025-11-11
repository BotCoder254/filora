import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Clock, 
  Users, 
  HardDrive,
  FileText,
  Image,
  Video,
  Archive,
  Share2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useFiles, useFolders } from '../../hooks/useFiles';
import { formatFileSize, formatDate } from '../../utils/helpers';
import api from '../../services/api';

const RightPanel = ({ activeTab }) => {
  const { data: files = [], isLoading: filesLoading } = useFiles();
  const { data: folders = [], isLoading: foldersLoading } = useFolders();
  
  // Fetch recent activity with better error handling and shorter intervals
  const { data: recentActivity = [], isLoading: activityLoading, refetch: refetchActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      try {
        const response = await api.get('/activity/?limit=5');
        return response.data.map(activity => ({
          action: activity.action,
          file: activity.object_name,
          time: formatDate(activity.timestamp),
          id: activity.id
        }));
      } catch (error) {
        console.error('Failed to fetch activity:', error);
        return [];
      }
    },
    refetchInterval: 5000, // Refetch every 5 seconds for more real-time feel
    staleTime: 2000,
    retry: 3
  });

  // Fetch dashboard stats with real-time updates
  const { data: dashboardStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const response = await api.get('/dashboard/');
        return response.data;
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        return null;
      }
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000,
    retry: 3
  });
  
  // Calculate storage breakdown using dashboard data (more accurate) with fallback to files data
  const getStorageBreakdown = () => {
    // Use dashboard stats if available (more accurate, includes all files)
    if (dashboardStats?.storage?.file_types) {
      const { file_types } = dashboardStats.storage;
      return [
        { 
          type: 'Documents', 
          size: formatFileSize(file_types.documents || 0),
          count: dashboardStats.stats?.documents_count || 0, 
          icon: FileText, 
          color: 'text-accent-primary' 
        },
        { 
          type: 'Images', 
          size: formatFileSize(file_types.images || 0),
          count: dashboardStats.stats?.images_count || 0, 
          icon: Image, 
          color: 'text-accent-secondary' 
        },
        { 
          type: 'Videos', 
          size: formatFileSize(file_types.videos || 0),
          count: dashboardStats.stats?.videos_count || 0, 
          icon: Video, 
          color: 'text-accent-warning' 
        },
        { 
          type: 'Others', 
          size: formatFileSize(file_types.other || 0),
          count: dashboardStats.stats?.others_count || 0, 
          icon: Archive, 
          color: 'text-text-muted' 
        },
      ];
    }
    
    // Fallback to local files calculation if dashboard stats not available
    if (!Array.isArray(files) || files.length === 0) {
      return [
        { type: 'Documents', size: '0 B', count: 0, icon: FileText, color: 'text-accent-primary' },
        { type: 'Images', size: '0 B', count: 0, icon: Image, color: 'text-accent-secondary' },
        { type: 'Videos', size: '0 B', count: 0, icon: Video, color: 'text-accent-warning' },
        { type: 'Others', size: '0 B', count: 0, icon: Archive, color: 'text-text-muted' },
      ];
    }
    
    const documents = files.filter(f => f.is_document);
    const images = files.filter(f => f.is_image);
    const videos = files.filter(f => f.is_video);
    const others = files.filter(f => !f.is_document && !f.is_image && !f.is_video);
    
    return [
      { 
        type: 'Documents', 
        size: formatFileSize(documents.reduce((sum, f) => sum + f.size_bytes, 0)),
        count: documents.length, 
        icon: FileText, 
        color: 'text-accent-primary' 
      },
      { 
        type: 'Images', 
        size: formatFileSize(images.reduce((sum, f) => sum + f.size_bytes, 0)),
        count: images.length, 
        icon: Image, 
        color: 'text-accent-secondary' 
      },
      { 
        type: 'Videos', 
        size: formatFileSize(videos.reduce((sum, f) => sum + f.size_bytes, 0)),
        count: videos.length, 
        icon: Video, 
        color: 'text-accent-warning' 
      },
      { 
        type: 'Others', 
        size: formatFileSize(others.reduce((sum, f) => sum + f.size_bytes, 0)),
        count: others.length, 
        icon: Archive, 
        color: 'text-text-muted' 
      },
    ];
  };
  
  const storageData = getStorageBreakdown();
  
  // Use dashboard stats when available, fallback to local calculation
  const totalFiles = dashboardStats?.stats?.total_files || (Array.isArray(files) ? files.length : 0);
  const totalFolders = dashboardStats?.stats?.total_folders || (Array.isArray(folders) ? folders.length : 0);
  const totalSize = dashboardStats?.storage?.used || (Array.isArray(files) ? files.reduce((sum, file) => sum + (file.size_bytes || 0), 0) : 0);
  const sharedFiles = dashboardStats?.stats?.total_shares || (Array.isArray(files) ? files.filter(f => f.shares_count > 0).length : 0);
  
  // Use dashboard stats if available for more accurate data
  const effectiveStats = dashboardStats?.stats || {};
  const effectiveStorage = dashboardStats?.storage || {};
  
  const quickStats = [
    { 
      label: 'Total Files', 
      value: (effectiveStats.total_files ?? totalFiles).toString(), 
      icon: FileText,
      trend: dashboardStats?.quick_stats?.files_this_week || 0
    },
    { 
      label: 'Storage Used', 
      value: formatFileSize(effectiveStorage.used ?? totalSize), 
      icon: HardDrive,
      percentage: effectiveStorage.percentage || ((totalSize / (10 * 1024 * 1024 * 1024)) * 100)
    },
    { 
      label: 'Shared Items', 
      value: (effectiveStats.total_shares ?? sharedFiles).toString(), 
      icon: Share2,
      trend: dashboardStats?.quick_stats?.shares_this_week || 0
    },
  ];

  return (
    <div className="h-full p-4 space-y-6 overflow-y-auto">
      {/* Quick Stats */}
      <div className="bg-dark-surface1 border border-dark-border rounded-xl p-4">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Quick Stats</h3>
        <div className="space-y-3">
          {filesLoading || foldersLoading || statsLoading ? (
            <div className="text-text-muted text-center py-4">Loading...</div>
          ) : (
            quickStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index} 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4 text-text-muted" />
                    <span className="text-text-secondary text-sm">{stat.label}</span>
                    {stat.trend !== undefined && stat.trend > 0 && (
                      <span className="text-accent-success text-xs">+{stat.trend} this week</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-text-primary font-medium">{stat.value}</span>
                    {stat.percentage !== undefined && (
                      <span className="text-text-muted text-xs">({stat.percentage.toFixed(1)}%)</span>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Storage Breakdown */}
      <div className="bg-dark-surface1 border border-dark-border rounded-xl p-4">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Storage Usage</h3>
        <div className="space-y-3">
          {filesLoading ? (
            <div className="text-text-muted text-center py-4">Loading...</div>
          ) : (
            storageData.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <div>
                      <p className="text-text-primary text-sm font-medium">{item.type}</p>
                      <p className="text-text-muted text-xs">{item.count} files</p>
                    </div>
                  </div>
                  <span className="text-text-secondary text-sm">{item.size}</span>
                </motion.div>
              );
            })
          )}
        </div>
        <div className="mt-4 pt-3 border-t border-dark-border">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-text-secondary">Used</span>
            <span className="text-text-primary">{formatFileSize(effectiveStorage.used ?? totalSize)} of {formatFileSize(effectiveStorage.total ?? (10 * 1024 * 1024 * 1024))}</span>
          </div>
          <div className="w-full bg-dark-border rounded-full h-2">
            <div 
              className="bg-accent-primary h-2 rounded-full" 
              style={{ width: `${Math.min(effectiveStorage.percentage ?? ((totalSize / (10 * 1024 * 1024 * 1024)) * 100), 100)}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-dark-surface1 border border-dark-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Recent Activity</h3>
          <button 
            onClick={refetchActivity}
            disabled={activityLoading}
            className="text-text-muted hover:text-text-primary text-xs"
          >
            {activityLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        <div className="space-y-3">
          {activityLoading ? (
            <div className="text-text-muted text-center py-4">Loading activity...</div>
          ) : recentActivity.length === 0 ? (
            <div className="text-text-muted text-center py-4">No recent activity</div>
          ) : (
            recentActivity.map((activity, index) => (
              <motion.div
                key={activity.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start space-x-3"
              >
                <div className="w-2 h-2 bg-accent-primary rounded-full mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm">
                    <span className="font-medium">{activity.action}</span> {activity.file}
                  </p>
                  <p className="text-text-muted text-xs">{activity.time}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Most Downloaded Files */}
      <div className="bg-dark-surface1 border border-dark-border rounded-xl p-4">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="w-5 h-5 text-accent-secondary" />
          <h3 className="text-lg font-semibold text-text-primary">Most Downloaded</h3>
        </div>
        <div className="space-y-3">
          {Array.isArray(files) && files.length > 0 ? (
            files
              .filter(f => f.download_count > 0)
              .sort((a, b) => b.download_count - a.download_count)
              .slice(0, 3)
              .map((file, index) => (
                <div key={file.id} className="flex items-center justify-between">
                  <span className="text-text-primary text-sm truncate">{file.name}</span>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-accent-success" />
                    <span className="text-accent-success text-xs">{file.download_count}</span>
                  </div>
                </div>
              ))
          ) : null}
          {(!Array.isArray(files) || files.filter(f => f.download_count > 0).length === 0) && (
            <div className="text-text-muted text-center py-4">No downloads yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RightPanel;