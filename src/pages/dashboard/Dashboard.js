import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  FolderPlus, 
  Files, 
  Share2, 
  HardDrive,
  TrendingUp,
  FileText,
  Image,
  Video,
  Activity,
  Key,
  Webhook,
  Download,
  Users,
  Clock,
  BarChart3
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Button from '../../components/ui/Button';
import ActivityLog from '../../components/file-manager/ActivityLog';
import StorageChart from '../../components/charts/StorageChart';
import UploadTrendsChart from '../../components/charts/UploadTrendsChart';
import StatsCard from '../../components/charts/StatsCard';
import { getDashboardData, formatFileSize, formatNumber } from '../../services/dashboard';

const Dashboard = () => {
  const [showActivityLog, setShowActivityLog] = useState(false);
  
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboardData().then(res => res.data),
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 5000 // Consider data stale after 5 seconds
  });

  const quickActions = [
    { label: 'Upload Files', icon: Upload, action: () => {}, variant: 'primary' },
    { label: 'New Folder', icon: FolderPlus, action: () => {}, variant: 'secondary' },
    { label: 'Create Token', icon: Key, action: () => {}, variant: 'ghost' },
    { label: 'Activity Log', icon: Activity, action: () => setShowActivityLog(true), variant: 'ghost' },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-dark-surface1 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-dark-surface1 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-dark-surface1 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-accent-error">Failed to load dashboard data</p>
          <Button variant="primary" onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { storage, stats, recent_files, recent_activity, upload_trends, quick_stats } = dashboardData;

  // Empty state check
  const isEmpty = stats.total_files === 0;

  if (isEmpty) {
    return (
      <div className="p-6">
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-accent-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Files className="w-12 h-12 text-accent-primary" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Welcome to Filora!</h2>
          <p className="text-text-secondary mb-8 max-w-md mx-auto">
            Get started by uploading your first file or creating a folder to organize your content.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" size="lg">
              <Upload className="w-5 h-5 mr-2" />
              Upload Your First File
            </Button>
            <Button variant="secondary" size="lg">
              <FolderPlus className="w-5 h-5 mr-2" />
              Create Folder
            </Button>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-accent-secondary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-accent-secondary" />
              </div>
              <h3 className="font-semibold text-text-primary mb-2">1. Upload Files</h3>
              <p className="text-sm text-text-muted">Drag and drop or click to upload your documents, images, and videos.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-accent-warning/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FolderPlus className="w-6 h-6 text-accent-warning" />
              </div>
              <h3 className="font-semibold text-text-primary mb-2">2. Organize</h3>
              <p className="text-sm text-text-muted">Create folders and organize your files for easy access and management.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-accent-success/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Share2 className="w-6 h-6 text-accent-success" />
              </div>
              <h3 className="font-semibold text-text-primary mb-2">3. Share</h3>
              <p className="text-sm text-text-muted">Share files securely with others using links or direct collaboration.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary">Welcome back! Here's your real-time overview.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant={action.variant}
                  onClick={action.action}
                  className="flex items-center space-x-2"
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{action.label}</span>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Files"
          value={formatNumber(stats.total_files)}
          icon={Files}
          color="text-accent-primary"
          trend={quick_stats.files_this_week > 0 ? 'up' : 'neutral'}
          trendValue={`+${quick_stats.files_this_week} this week`}
          delay={0}
        />
        <StatsCard
          title="Storage Used"
          value={formatFileSize(storage.used)}
          icon={HardDrive}
          color="text-accent-secondary"
          trend={storage.percentage > 80 ? 'up' : 'neutral'}
          trendValue={`${storage.percentage.toFixed(1)}% of quota`}
          delay={0.1}
        />
        <StatsCard
          title="Total Shares"
          value={formatNumber(stats.total_shares)}
          icon={Share2}
          color="text-accent-warning"
          trend={quick_stats.shares_this_week > 0 ? 'up' : 'neutral'}
          trendValue={`+${quick_stats.shares_this_week} this week`}
          delay={0.2}
        />
        <StatsCard
          title="Downloads"
          value={formatNumber(quick_stats.downloads_this_week)}
          icon={Download}
          color="text-accent-success"
          trend={quick_stats.downloads_this_week > 0 ? 'up' : 'neutral'}
          trendValue="this week"
          delay={0.3}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Storage Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-dark-surface1 border border-dark-border rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-text-primary">Storage Usage</h3>
            <div className="text-sm text-text-muted">
              {storage.percentage.toFixed(1)}% used
            </div>
          </div>
          <StorageChart fileTypes={storage.file_types} totalSize={storage.used} />
          <div className="mt-6 space-y-3">
            {[
              { type: 'Documents', size: storage.file_types.documents, color: '#E63946' },
              { type: 'Images', size: storage.file_types.images, color: '#06D6A0' },
              { type: 'Videos', size: storage.file_types.videos, color: '#FFD166' },
              { type: 'Audio', size: storage.file_types.audio, color: '#118AB2' },
              { type: 'Other', size: storage.file_types.other, color: '#7A7A7A' }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-text-secondary text-sm">{item.type}</span>
                </div>
                <span className="text-text-primary text-sm font-medium">
                  {formatFileSize(item.size)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Upload Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-dark-surface1 border border-dark-border rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-text-primary">Upload Trends</h3>
            <BarChart3 className="w-5 h-5 text-text-muted" />
          </div>
          <UploadTrendsChart uploadTrends={upload_trends} />
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-dark-surface1 border border-dark-border rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-text-primary">Recent Activity</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowActivityLog(true)}
            >
              View All
            </Button>
          </div>
          <div className="space-y-4">
            {recent_activity.slice(0, 5).map((activity, index) => {
              const getActivityIcon = (objectType) => {
                if (objectType === 'file') return FileText;
                if (objectType === 'folder') return FolderPlus;
                if (objectType === 'share') return Share2;
                if (objectType === 'token') return Key;
                if (objectType === 'webhook') return Webhook;
                return Activity;
              };
              const Icon = getActivityIcon(activity.object_type);
              
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-3"
                >
                  <div className="w-8 h-8 bg-accent-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-accent-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium">
                      {activity.user_name} {activity.action} {activity.object_name}
                    </p>
                    <p className="text-text-muted text-xs">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              );
            })}
            {recent_activity.length === 0 && (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-muted">No recent activity</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Files */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-dark-surface1 border border-dark-border rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-text-primary mb-6">Recent Files</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {recent_files.slice(0, 8).map((file, index) => {
            const getFileIcon = (mimeType) => {
              if (mimeType?.startsWith('image/')) return Image;
              if (mimeType?.startsWith('video/')) return Video;
              return FileText;
            };
            const Icon = getFileIcon(file.mime_type);
            
            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -2 }}
                className="p-4 border border-dark-border rounded-lg hover:bg-dark-hover transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-accent-primary/20 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-accent-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-medium truncate">{file.name}</p>
                    <p className="text-text-muted text-xs">
                      {formatFileSize(file.size_bytes)} • {new Date(file.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        {recent_files.length === 0 && (
          <div className="text-center py-12">
            <Files className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted">No recent files</p>
          </div>
        )}
      </motion.div>
      
      {/* Activity Log Modal */}
      <ActivityLog
        isOpen={showActivityLog}
        onClose={() => setShowActivityLog(false)}
      />
    </div>
  );
};

export default Dashboard;