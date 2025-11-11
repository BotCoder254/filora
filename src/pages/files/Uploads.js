import React from 'react';
import { motion } from 'framer-motion';
import { Upload, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { formatFileSize, formatDate } from '../../utils/helpers';

const Uploads = () => {
  const { data: uploads = [], isLoading } = useQuery({
    queryKey: ['uploads'],
    queryFn: async () => {
      try {
        // Use empty folder parameter to get ALL files regardless of folder
        const response = await api.get('/files/?folder=&limit=50&sort_by=-created_at');
        console.log('All files API response:', response.data);
        
        const files = response.data.files || response.data || [];
        const mappedFiles = files.map(file => ({
          id: file.id,
          name: file.name,
          status: file.status || 'completed',
          progress: 100,
          size: formatFileSize(file.size_bytes),
          created_at: file.created_at
        }));
        
        console.log('Mapped uploads:', mappedFiles);
        return mappedFiles;
      } catch (error) {
        console.error('Failed to fetch uploads:', error);
        return [];
      }
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-accent-success" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-accent-error" />;
      case 'uploading':
        return <Upload className="w-5 h-5 text-accent-primary animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-text-muted" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-accent-success';
      case 'failed':
        return 'text-accent-error';
      case 'uploading':
        return 'text-accent-primary';
      default:
        return 'text-text-muted';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Upload History</h1>
        <p className="text-text-secondary">Track your file upload progress and history</p>
      </div>

      <div className="bg-dark-surface1 border border-dark-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border">
          <h3 className="text-lg font-semibold text-text-primary">Recent Uploads</h3>
        </div>
        <div className="divide-y divide-dark-border">
          {isLoading ? (
            <div className="p-6 text-center text-text-muted">Loading...</div>
          ) : uploads.length === 0 ? (
            <div className="p-6 text-center text-text-muted">
              No uploads yet
              <p className="text-xs mt-2">Debug: Check console for API response</p>
            </div>
          ) : (
            uploads.map((upload) => (
            <motion.div
              key={upload.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(upload.status)}
                  <div>
                    <p className="text-text-primary font-medium">{upload.name}</p>
                    <p className="text-text-muted text-sm">{upload.size}</p>
                  </div>
                </div>
                <span className={`text-sm font-medium capitalize ${getStatusColor(upload.status)}`}>
                  {upload.status}
                </span>
              </div>
              {upload.status === 'uploading' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Progress</span>
                    <span className="text-text-primary">{upload.progress}%</span>
                  </div>
                  <div className="w-full bg-dark-border rounded-full h-2">
                    <motion.div
                      className="bg-accent-primary h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${upload.progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Uploads;