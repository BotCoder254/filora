import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Search, Filter, Eye, Download, 
  FileText, Image, Video, Music, Folder,
  Calendar, User
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Button from '../../components/ui/Button';
import FileThumbnail from '../../components/file-manager/FileThumbnail';
import FilePreviewOverlay from '../../components/file-manager/FilePreviewOverlay';
import api from '../../services/api';
import { formatFileSize, formatDate } from '../../utils/helpers';

const SharedWithMe = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [previewFile, setPreviewFile] = useState(null);

  // Fetch shared files
  const { data: sharedData, isLoading } = useQuery({
    queryKey: ['shared-with-me'],
    queryFn: async () => {
      const response = await api.get('/shared-with-me/');
      return response.data;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const sharedFiles = sharedData?.shared_files || [];

  // Filter shared files
  const filteredFiles = sharedFiles.filter(item => {
    const matchesSearch = item.item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.shared_by.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterBy === 'all') return true;
    if (filterBy === 'files') return item.item_type === 'file';
    if (filterBy === 'folders') return item.item_type === 'folder';
    if (filterBy === 'images') return item.item.mime_type?.startsWith('image/');
    if (filterBy === 'videos') return item.item.mime_type?.startsWith('video/');
    if (filterBy === 'documents') return item.item.mime_type === 'application/pdf';
    
    return true;
  });

  const getFileIcon = (mimeType, size = 'w-5 h-5') => {
    if (mimeType?.startsWith('image/')) return <Image className={`${size} text-accent-secondary`} />;
    if (mimeType?.startsWith('video/')) return <Video className={`${size} text-accent-warning`} />;
    if (mimeType?.startsWith('audio/')) return <Music className={`${size} text-green-400`} />;
    return <FileText className={`${size} text-accent-primary`} />;
  };

  const getPermissionColor = (permission) => {
    switch (permission) {
      case 'owner': return 'text-accent-primary';
      case 'editor': return 'text-accent-warning';
      case 'viewer': return 'text-accent-secondary';
      default: return 'text-text-muted';
    }
  };

  const handlePreview = (item) => {
    if (item.item_type === 'file' && 
        (item.item.mime_type?.startsWith('image/') || 
         item.item.mime_type?.startsWith('video/') || 
         item.item.mime_type?.startsWith('audio/') || 
         item.item.mime_type === 'application/pdf')) {
      setPreviewFile(item.item.id);
    }
  };

  const handleDownload = async (item) => {
    try {
      const response = await api.get(`/files/${item.item.id}/download/`);
      window.open(response.data.download_url, '_blank');
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Users className="w-8 h-8 text-accent-primary" />
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Shared with Me</h1>
            <p className="text-text-secondary">Files and folders shared by others</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shared files..."
              className="w-full pl-10 pr-4 py-2 bg-dark-input border border-dark-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>
          
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="bg-dark-input border border-dark-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            <option value="all">All Items</option>
            <option value="files">Files Only</option>
            <option value="folders">Folders Only</option>
            <option value="images">Images</option>
            <option value="videos">Videos</option>
            <option value="documents">Documents</option>
          </select>
        </div>
      </div>

      {/* Shared Files List */}
      {filteredFiles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          {searchQuery || filterBy !== 'all' ? (
            <>
              <Search className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No results found</h3>
              <p className="text-text-secondary">Try adjusting your search or filter</p>
            </>
          ) : (
            <>
              <Users className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No shared files</h3>
              <p className="text-text-secondary">Files shared with you will appear here</p>
            </>
          )}
        </motion.div>
      ) : (
        <div className="space-y-2">
          {filteredFiles.map((item) => (
            <motion.div
              key={item.share_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4 p-4 bg-dark-surface1 rounded-lg border border-dark-border hover:bg-dark-hover transition-colors"
            >
              {/* Item Icon/Thumbnail */}
              <div className="flex-shrink-0">
                {item.item_type === 'file' ? (
                  <FileThumbnail
                    file={item.item}
                    size="small"
                    className="w-12 h-12"
                    onClick={() => handlePreview(item)}
                  />
                ) : (
                  <div className="w-12 h-12 bg-dark-surface2 rounded-lg flex items-center justify-center">
                    <Folder className="w-6 h-6 text-accent-secondary" />
                  </div>
                )}
              </div>

              {/* Item Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-text-primary font-medium truncate">{item.item.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full bg-opacity-20 ${getPermissionColor(item.permission)} bg-current`}>
                    {item.permission}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-text-secondary">
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span>Shared by {item.shared_by}</span>
                  </div>
                  
                  {item.item_type === 'file' && item.item.size_bytes && (
                    <>
                      <span>•</span>
                      <span>{formatFileSize(item.item.size_bytes)}</span>
                    </>
                  )}
                  
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(item.shared_at)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                {item.item_type === 'file' && 
                 (item.item.mime_type?.startsWith('image/') || 
                  item.item.mime_type?.startsWith('video/') || 
                  item.item.mime_type?.startsWith('audio/') || 
                  item.item.mime_type === 'application/pdf') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(item)}
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
                
                {item.item_type === 'file' && item.permission !== 'viewer' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(item)}
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* File Preview Overlay */}
      <FilePreviewOverlay
        fileId={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
};

export default SharedWithMe;