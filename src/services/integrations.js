import api from './api';

// API Tokens
export const getApiTokens = () => api.get('/integrations/tokens/');
export const createApiToken = (data) => api.post('/integrations/tokens/', data);
export const deleteApiToken = (id) => api.delete(`/integrations/tokens/${id}/`);

// Webhooks
export const getWebhooks = () => api.get('/integrations/webhooks/');
export const createWebhook = (data) => api.post('/integrations/webhooks/', data);
export const deleteWebhook = (id) => api.delete(`/integrations/webhooks/${id}/`);
export const testWebhook = (id) => api.post(`/integrations/webhooks/${id}/test/`);
export const getWebhookDeliveries = (webhookId) => api.get(`/integrations/webhooks/${webhookId}/deliveries/`);

// Stats
export const getIntegrationStats = () => api.get('/integrations/stats/');

// Scope and event options
export const SCOPE_OPTIONS = [
  { value: 'files.read', label: 'Read Files', description: 'View and download files and folders' },
  { value: 'files.write', label: 'Write Files', description: 'Create, update, and delete files and folders' },
  { value: 'webhooks.manage', label: 'Manage Webhooks', description: 'Create and manage webhook endpoints' }
];

export const EVENT_OPTIONS = [
  { value: 'upload.completed', label: 'Upload Completed', description: 'Triggered when a file upload is completed' },
  { value: 'file.deleted', label: 'File Deleted', description: 'Triggered when a file is deleted' },
  { value: 'share.created', label: 'Share Created', description: 'Triggered when a new share is created' },
  { value: 'file.updated', label: 'File Updated', description: 'Triggered when a file is updated' },
  { value: 'folder.created', label: 'Folder Created', description: 'Triggered when a new folder is created' }
];

export const EXPIRY_OPTIONS = [
  { value: null, label: 'Never' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '1 year' }
];