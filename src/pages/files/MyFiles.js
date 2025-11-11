import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  FolderPlus, 
  ArrowLeft,
  Folder,
  Search
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import FileUpload from '../../components/file-manager/FileUpload';
import FileMetadataPanel from '../../components/file-manager/FileMetadataPanel';
import Breadcrumbs from '../../components/file-manager/Breadcrumbs';
import CreateFolderModal from '../../components/file-manager/CreateFolderModal';
import FileListControls from '../../components/file-manager/FileListControls';
import FileGrid from '../../components/file-manager/FileGrid';
import FileList from '../../components/file-manager/FileList';
import FilePagination from '../../components/file-manager/FilePagination';
import api from '../../services/api';

const MyFiles = () => {
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('fileViewMode') || 'grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('-modified_at');
  const [selectedType, setSelectedType] = useState('');
  const [pageSize, setPageSize] = useState(50);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [allFiles, setAllFiles] = useState([]);
  const [cursor, setCursor] = useState(null);
  const queryClient = useQueryClient();
  
  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('fileViewMode', viewMode);
  }, [viewMode]);
  
  // Fetch folders
  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ['folders', currentFolder],
    queryFn: async () => {
      const response = await api.get(`/folders/?parent=${currentFolder || ''}`);
      return response.data;
    }
  });
  
  // Fetch files with pagination and filtering
  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ['files', currentFolder, searchQuery, sortBy, selectedType, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        folder: currentFolder || '',
        sort_by: sortBy,
        limit: pageSize.toString()
      });
      
      if (searchQuery) params.append('q', searchQuery);
      if (selectedType) params.append('type', selectedType);
      
      const response = await api.get(`/files/?${params}`);
      return response.data;
    },
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
    staleTime: 5000
  });
  
  // Fetch breadcrumbs for current folder
  const { data: breadcrumbsData } = useQuery({
    queryKey: ['breadcrumbs', currentFolder],
    queryFn: async () => {
      if (currentFolder) {
        const response = await api.get(`/folders/${currentFolder}/contents/`);
        return response.data.breadcrumbs;
      }
      return [{ id: null, name: 'My Files' }];
    }
  });
  
  const folders = foldersData || [];
  const files = filesData?.files || []; // Fix: filesData directly contains files, not pages
  const breadcrumbs = breadcrumbsData || [];
  const totalCount = filesData?.total_count;
  const hasMore = filesData?.has_more;
  
  // Mutations
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId) => {
      await api.delete(`/files/${fileId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    }
  });
  
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId) => {
      await api.delete(`/folders/${folderId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    }
  });
  
  const moveFileMutation = useMutation({
    mutationFn: async ({ fileId, folderId }) => {
      const response = await api.post(`/files/${fileId}/move/`, { folder_id: folderId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    }
  });
  
  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    // Invalidate files for current folder and refetch
    queryClient.invalidateQueries({ queryKey: ['files', currentFolder] });
    queryClient.invalidateQueries({ queryKey: ['files'] }); // Also invalidate general files query
    queryClient.invalidateQueries({ queryKey: ['uploads'] }); // Update uploads/recent uploads
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }); // Update dashboard stats
    queryClient.invalidateQueries({ queryKey: ['recent-activity'] }); // Update recent activity
  };
  
  const handleFolderCreated = () => {
    setShowCreateFolderModal(false);
    queryClient.invalidateQueries({ queryKey: ['folders'] });
  };
  
  // Event handlers
  const handleNavigateToFolder = (folderId) => {
    setCurrentFolder(folderId);
    setSelectedFile(null);
    setSelectedItems([]);
  };
  
  const handleBackToParent = () => {
    const currentBreadcrumb = breadcrumbs.find(b => b.id === currentFolder);
    if (currentBreadcrumb && breadcrumbs.length > 1) {
      const currentIndex = breadcrumbs.findIndex(b => b.id === currentFolder);
      const parentBreadcrumb = breadcrumbs[currentIndex - 1];
      setCurrentFolder(parentBreadcrumb.id);
    } else {
      setCurrentFolder(null);
    }
    setSelectedFile(null);
    setSelectedItems([]);
  };
  
  const handleItemSelect = (itemId, type) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };
  
  const handleItemClick = (itemId, type) => {
    if (type === 'file') {
      setSelectedFile(itemId);
    }
  };
  
  const handleDeleteFile = async (fileId) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      deleteFileMutation.mutate(fileId);
    }
  };
  
  const handleDeleteFolder = async (folderId) => {
    if (window.confirm('Are you sure you want to delete this folder?')) {
      deleteFolderMutation.mutate(folderId);
    }
  };
  
  // Drag and drop handlers
  const handleDragStart = (e, item, type) => {
    setDraggedItem({ ...item, type });
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e, folderId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(folderId);
  };
  
  const handleDragLeave = () => {
    setDropTarget(null);
  };
  
  const handleDrop = (e, targetFolderId) => {
    e.preventDefault();
    
    if (draggedItem && draggedItem.type === 'file') {
      moveFileMutation.mutate({
        fileId: draggedItem.id,
        folderId: targetFolderId
      });
    }
    
    setDraggedItem(null);
    setDropTarget(null);
  };
  
  const handleLoadMore = () => {
    // Increase page size to load more files
    setPageSize(prev => prev + 50);
  };
  
  const isLoading = foldersLoading || filesLoading;



  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            {currentFolder && (
              <Button variant="ghost" size="sm" onClick={handleBackToParent}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                {breadcrumbs[breadcrumbs.length - 1]?.name || 'My Files'}
              </h1>
              <p className="text-text-secondary">Manage your files and folders</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button variant="secondary" onClick={() => setShowCreateFolderModal(true)}>
              <FolderPlus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
            <Button variant="primary" onClick={() => setShowUploadModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>
        </div>
        
        {/* Breadcrumbs */}
        <Breadcrumbs 
          breadcrumbs={breadcrumbs} 
          onNavigate={handleNavigateToFolder}
        />
      </div>

      {/* File List Controls */}
      <FileListControls
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedCount={selectedItems.length}
        onClearSelection={() => setSelectedItems([])}
      />
      
      {/* File Content */}
      {isLoading && files.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-text-muted">Loading...</div>
        </div>
      ) : files.length === 0 && folders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          {searchQuery || selectedType ? (
            <>
              <Search className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No results found</h3>
              <p className="text-text-secondary mb-6">Try adjusting your search terms or filters</p>
            </>
          ) : (
            <>
              <Folder className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No files yet</h3>
              <p className="text-text-secondary mb-6">Upload your first file to get started</p>
              <Button variant="primary" onClick={() => setShowUploadModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
            </>
          )}
        </motion.div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <FileGrid
              files={files}
              folders={folders}
              selectedItems={selectedItems}
              onItemSelect={handleItemSelect}
              onItemClick={handleItemClick}
              onFolderNavigate={handleNavigateToFolder}
              draggedItem={draggedItem}
              dropTarget={dropTarget}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          ) : (
            <FileList
              files={files}
              folders={folders}
              selectedItems={selectedItems}
              onItemSelect={handleItemSelect}
              onItemClick={handleItemClick}
              onFolderNavigate={handleNavigateToFolder}
              draggedItem={draggedItem}
              dropTarget={dropTarget}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDeleteFile={handleDeleteFile}
              onDeleteFolder={handleDeleteFolder}
            />
          )}
          
          {/* Pagination */}
          <FilePagination
            hasMore={hasMore}
            isLoading={filesLoading}
            onLoadMore={handleLoadMore}
            totalCount={totalCount}
            currentCount={files.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
      
      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Files"
        size="lg"
      >
        <FileUpload
          folderId={currentFolder}
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      </Modal>
      
      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        parentFolderId={currentFolder}
      />
      </div>
      
      {/* File Metadata Panel */}
      {selectedFile && (
        <FileMetadataPanel
          fileId={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  );
};

export default MyFiles;