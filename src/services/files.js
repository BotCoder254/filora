import api from './api';

export const filesService = {
  async getFolders(parentId = null) {
    const params = parentId ? { parent: parentId } : {};
    const response = await api.get('/folders/', { params });
    return response.data;
  },

  async createFolder(folderData) {
    const response = await api.post('/folders/', folderData);
    return response.data;
  },

  async updateFolder(folderId, folderData) {
    const response = await api.put(`/folders/${folderId}/`, folderData);
    return response.data;
  },

  async deleteFolder(folderId) {
    await api.delete(`/folders/${folderId}/`);
  },

  async getFiles(folderId = null) {
    const params = folderId ? { folder: folderId } : {};
    const response = await api.get('/files/', { params });
    return response.data;
  },

  async uploadFile(fileData) {
    const formData = new FormData();
    formData.append('file', fileData.file);
    if (fileData.folder) {
      formData.append('folder', fileData.folder);
    }
    
    const response = await api.post('/files/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async updateFile(fileId, fileData) {
    const response = await api.put(`/files/${fileId}/`, fileData);
    return response.data;
  },

  async deleteFile(fileId) {
    await api.delete(`/files/${fileId}/`);
  },

  async createShareLink(shareData) {
    const response = await api.post('/share/', shareData);
    return response.data;
  },

  // Versioning
  async getFileVersions(fileId) {
    const response = await api.get(`/files/${fileId}/versions/`);
    return response.data;
  },

  async restoreFileVersion(fileId, versionId) {
    const response = await api.post(`/files/${fileId}/versions/${versionId}/restore/`);
    return response.data;
  },

  // Activity
  async getFileActivity(fileId) {
    const response = await api.get(`/files/${fileId}/activity/`);
    return response.data;
  },

  async getUserActivity(params = {}) {
    const response = await api.get('/activity/', { params });
    return response.data;
  }
};