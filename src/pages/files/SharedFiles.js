import React from 'react';
import { motion } from 'framer-motion';
import { Share2, ExternalLink, Copy, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Button from '../../components/ui/Button';
import api from '../../services/api';
import { formatDate } from '../../utils/helpers';

const SharedFiles = () => {
  const { data: sharedItems = [], isLoading } = useQuery({
    queryKey: ['shared-files'],
    queryFn: async () => {
      const response = await api.get('/files/?shared=true');
      return response.data.map(file => ({
        id: file.id,
        name: file.name,
        type: 'file',
        permission: 'view',
        expires: file.share_expires_at ? formatDate(file.share_expires_at) : null,
        views: file.share_views || 0
      }));
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Shared Files</h1>
          <p className="text-text-secondary">Files and folders you've shared with others</p>
        </div>
      </div>

      <div className="bg-dark-surface1 border border-dark-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border">
          <h3 className="text-lg font-semibold text-text-primary">Active Share Links</h3>
        </div>
        <div className="divide-y divide-dark-border">
          {isLoading ? (
            <div className="p-6 text-center text-text-muted">Loading...</div>
          ) : sharedItems.length === 0 ? (
            <div className="p-6 text-center text-text-muted">No shared files yet</div>
          ) : (
            sharedItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 hover:bg-dark-hover transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-accent-secondary/20 rounded-lg flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-accent-secondary" />
                  </div>
                  <div>
                    <p className="text-text-primary font-medium">{item.name}</p>
                    <div className="flex items-center space-x-4 text-sm text-text-muted">
                      <span className="capitalize">{item.permission} access</span>
                      <span>•</span>
                      <span>{item.views} views</span>
                      {item.expires && (
                        <>
                          <span>•</span>
                          <span>Expires {item.expires}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedFiles;