import api from './api';

class UploadService {
  constructor() {
    this.activeUploads = new Map();
  }

  async initUpload(file, folderId = null) {
    const response = await api.post('/uploads/init/', {
      filename: file.name,
      size: file.size,
      mime_type: file.type,
      folder_id: folderId
    });
    return response.data;
  }

  async uploadFileChunked(file, folderId = null, onProgress = () => {}) {
    const uploadId = `${Date.now()}-${Math.random()}`;
    
    try {
      // Initialize upload
      const initData = await this.initUpload(file, folderId);
      const { upload_id, chunk_size } = initData;
      
      const totalChunks = Math.ceil(file.size / chunk_size);
      let uploadedChunks = 0;
      
      // Create upload session
      const uploadSession = {
        id: uploadId,
        file,
        upload_id,
        status: 'uploading',
        progress: 0,
        uploadedChunks: 0,
        totalChunks,
        cancelled: false
      };
      
      this.activeUploads.set(uploadId, uploadSession);
      
      // Upload chunks
      for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber++) {
        if (uploadSession.cancelled) {
          throw new Error('Upload cancelled');
        }
        
        const start = chunkNumber * chunk_size;
        const end = Math.min(start + chunk_size, file.size);
        const chunk = file.slice(start, end);
        
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunk_number', chunkNumber);
        formData.append('total_chunks', totalChunks);
        
        await api.post(`/uploads/${upload_id}/chunk/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        uploadedChunks++;
        const progress = (uploadedChunks / totalChunks) * 100;
        
        uploadSession.progress = progress;
        uploadSession.uploadedChunks = uploadedChunks;
        
        onProgress({
          uploadId,
          progress,
          uploadedChunks,
          totalChunks,
          status: 'uploading'
        });
      }
      
      // Complete upload
      uploadSession.status = 'processing';
      onProgress({
        uploadId,
        progress: 100,
        status: 'processing'
      });
      
      const completeResponse = await api.post(`/uploads/${upload_id}/complete/`);
      
      uploadSession.status = 'completed';
      uploadSession.fileData = completeResponse.data;
      
      onProgress({
        uploadId,
        progress: 100,
        status: 'completed',
        fileData: completeResponse.data
      });
      
      this.activeUploads.delete(uploadId);
      return completeResponse.data;
      
    } catch (error) {
      const uploadSession = this.activeUploads.get(uploadId);
      if (uploadSession) {
        uploadSession.status = 'failed';
        uploadSession.error = error.message;
        
        onProgress({
          uploadId,
          status: 'failed',
          error: error.message
        });
      }
      
      this.activeUploads.delete(uploadId);
      throw error;
    }
  }

  async cancelUpload(uploadId) {
    const uploadSession = this.activeUploads.get(uploadId);
    if (uploadSession) {
      uploadSession.cancelled = true;
      
      try {
        await api.delete(`/uploads/${uploadSession.upload_id}/cancel/`);
      } catch (error) {
        console.error('Error cancelling upload:', error);
      }
      
      this.activeUploads.delete(uploadId);
    }
  }

  getActiveUploads() {
    return Array.from(this.activeUploads.values());
  }

  async uploadMultipleFiles(files, folderId = null, onProgress = () => {}) {
    const uploads = [];
    
    for (const file of files) {
      const uploadPromise = this.uploadFileChunked(file, folderId, onProgress);
      uploads.push(uploadPromise);
    }
    
    return Promise.allSettled(uploads);
  }
}

export const uploadService = new UploadService();