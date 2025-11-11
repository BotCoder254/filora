import { useState } from 'react';
import api from '../services/api';

export const useDownload = () => {
  const [downloadProgress, setDownloadProgress] = useState({});
  const [downloadStatus, setDownloadStatus] = useState({});

  const downloadFile = async (fileId, filename) => {
    try {
      setDownloadStatus(prev => ({ ...prev, [fileId]: 'downloading' }));
      setDownloadProgress(prev => ({ ...prev, [fileId]: 0 }));

      // Create axios request with progress tracking
      const response = await api.get(`/files/${fileId}/download/`, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setDownloadProgress(prev => ({ ...prev, [fileId]: progress }));
          }
        }
      });

      // Create blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Get filename from content-disposition header or use provided filename
      const contentDisposition = response.headers['content-disposition'];
      let downloadFilename = filename;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          downloadFilename = filenameMatch[1];
        }
      }
      
      link.href = url;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
      setDownloadStatus(prev => ({ ...prev, [fileId]: 'completed' }));
      setDownloadProgress(prev => ({ ...prev, [fileId]: 100 }));
      
      // Reset after 2 seconds
      setTimeout(() => {
        setDownloadStatus(prev => {
          const newState = { ...prev };
          delete newState[fileId];
          return newState;
        });
        setDownloadProgress(prev => {
          const newState = { ...prev };
          delete newState[fileId];
          return newState;
        });
      }, 2000);

    } catch (error) {
      console.error('Download failed:', error);
      setDownloadStatus(prev => ({ ...prev, [fileId]: 'error' }));
      
      // Reset error after 3 seconds
      setTimeout(() => {
        setDownloadStatus(prev => {
          const newState = { ...prev };
          delete newState[fileId];
          return newState;
        });
        setDownloadProgress(prev => {
          const newState = { ...prev };
          delete newState[fileId];
          return newState;
        });
      }, 3000);
      
      throw error;
    }
  };

  return {
    downloadFile,
    downloadProgress,
    downloadStatus
  };
};