import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Key, Copy, Eye, EyeOff, Plus, Trash2, Webhook, Play, ExternalLink, Calendar, Shield } from 'lucide-react';
import Button from '../../components/ui/Button';
import CreateTokenModal from '../../components/integrations/CreateTokenModal';
import CreateWebhookModal from '../../components/integrations/CreateWebhookModal';
import UsageStats from '../../components/integrations/UsageStats';
import {
  getApiTokens,
  createApiToken,
  deleteApiToken,
  getWebhooks,
  createWebhook,
  deleteWebhook,
  testWebhook,
  getIntegrationStats
} from '../../services/integrations';

const Integrations = () => {
  const [showCreateTokenModal, setShowCreateTokenModal] = useState(false);
  const [showCreateWebhookModal, setShowCreateWebhookModal] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState({});
  const queryClient = useQueryClient();

  // Queries
  const { data: tokens = [], isLoading: tokensLoading } = useQuery({
    queryKey: ['api-tokens'],
    queryFn: () => getApiTokens().then(res => res.data),
    refetchInterval: 30000
  });

  const { data: webhooks = [], isLoading: webhooksLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => getWebhooks().then(res => res.data),
    refetchInterval: 30000
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['integration-stats'],
    queryFn: () => getIntegrationStats().then(res => res.data),
    refetchInterval: 15000 // Refresh every 15 seconds
  });

  // Mutations
  const createTokenMutation = useMutation({
    mutationFn: createApiToken,
    onSuccess: (response) => {
      queryClient.invalidateQueries(['api-tokens']);
      queryClient.invalidateQueries(['integration-stats']);
      return response.data;
    }
  });

  const deleteTokenMutation = useMutation({
    mutationFn: deleteApiToken,
    onSuccess: () => {
      queryClient.invalidateQueries(['api-tokens']);
      queryClient.invalidateQueries(['integration-stats']);
    }
  });

  const createWebhookMutation = useMutation({
    mutationFn: createWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks']);
      queryClient.invalidateQueries(['integration-stats']);
    }
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks']);
      queryClient.invalidateQueries(['integration-stats']);
    }
  });

  const testWebhookMutation = useMutation({
    mutationFn: testWebhook
  });

  const toggleKeyVisibility = (keyId) => {
    setVisibleKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const maskKey = (key) => {
    return 'fl_' + '••••••••••••••••••••••••••••••••';
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatScopes = (scopes) => {
    return scopes.map(scope => scope.replace('files.', '').replace('webhooks.', '')).join(', ');
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'text-accent-success' : 'text-accent-error';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Integrations & API</h1>
          <p className="text-text-secondary">Manage your API tokens, webhooks, and developer integrations</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary" onClick={() => setShowCreateWebhookModal(true)}>
            <Webhook className="w-4 h-4 mr-2" />
            Add Webhook
          </Button>
          <Button variant="primary" onClick={() => setShowCreateTokenModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Token
          </Button>
        </div>
      </div>

      {/* Usage Statistics */}
      <UsageStats stats={stats} isLoading={statsLoading} />

      {/* API Documentation */}
      <div className="bg-dark-surface1 border border-dark-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">API Documentation</h3>
          <Button variant="ghost" size="sm">
            <ExternalLink className="w-4 h-4 mr-2" />
            View Docs
          </Button>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <h4 className="text-text-primary font-medium mb-2">Base URL</h4>
            <div className="bg-dark-input p-3 rounded-lg font-mono text-sm text-text-secondary">
              http://localhost:8000/api/v1
            </div>
          </div>
          <div>
            <h4 className="text-text-primary font-medium mb-2">Authentication</h4>
            <div className="bg-dark-input p-3 rounded-lg font-mono text-sm text-text-secondary">
              Authorization: Bearer YOUR_TOKEN
            </div>
          </div>
          <div>
            <h4 className="text-text-primary font-medium mb-2">Content Type</h4>
            <div className="bg-dark-input p-3 rounded-lg font-mono text-sm text-text-secondary">
              Content-Type: application/json
            </div>
          </div>
        </div>
      </div>

      {/* API Tokens */}
      <div className="bg-dark-surface1 border border-dark-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border">
          <h3 className="text-lg font-semibold text-text-primary">API Tokens</h3>
        </div>
        <div className="divide-y divide-dark-border">
          {tokensLoading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-dark-input rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-dark-input rounded w-1/4"></div>
                      <div className="h-3 bg-dark-input rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : tokens.length === 0 ? (
            <div className="p-6 text-center">
              <Key className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted">No API tokens created yet</p>
              <p className="text-sm text-text-muted mt-1">Create your first token to start using the API</p>
            </div>
          ) : (
            tokens.map((token) => (
              <motion.div
                key={token.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-accent-primary/20 rounded-lg flex items-center justify-center">
                      <Key className="w-5 h-5 text-accent-primary" />
                    </div>
                    <div>
                      <p className="text-text-primary font-medium">{token.name}</p>
                      <div className="flex items-center space-x-4 text-sm text-text-muted">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Created {formatDate(token.created_at)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center">
                          <Shield className="w-3 h-3 mr-1" />
                          {formatScopes(token.scopes)}
                        </span>
                        {token.last_used_at && (
                          <>
                            <span>•</span>
                            <span>Last used {formatDate(token.last_used_at)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-text-muted">
                      {token.usage_count} calls
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(maskKey())}
                      title="Copy masked token"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => deleteTokenMutation.mutate(token.id)}
                      disabled={deleteTokenMutation.isLoading}
                    >
                      <Trash2 className="w-4 h-4 text-accent-error" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 bg-dark-input p-3 rounded-lg font-mono text-sm text-text-secondary">
                  {maskKey()}
                </div>
                {token.expires_at && (
                  <div className="mt-2 text-sm text-accent-warning">
                    Expires on {formatDate(token.expires_at)}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Webhooks */}
      <div className="bg-dark-surface1 border border-dark-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border">
          <h3 className="text-lg font-semibold text-text-primary">Webhooks</h3>
        </div>
        <div className="divide-y divide-dark-border">
          {webhooksLoading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-dark-input rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-dark-input rounded w-1/3"></div>
                      <div className="h-3 bg-dark-input rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="p-6 text-center">
              <Webhook className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted">No webhooks configured yet</p>
              <p className="text-sm text-text-muted mt-1">Add webhooks to receive real-time notifications</p>
            </div>
          ) : (
            webhooks.map((webhook) => (
              <motion.div
                key={webhook.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-accent-secondary/20 rounded-lg flex items-center justify-center">
                      <Webhook className="w-5 h-5 text-accent-secondary" />
                    </div>
                    <div>
                      <p className="text-text-primary font-medium font-mono text-sm">{webhook.url}</p>
                      <div className="flex items-center space-x-4 text-sm text-text-muted">
                        <span className={getStatusColor(webhook.is_active)}>
                          {webhook.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span>•</span>
                        <span>{webhook.events.length} events</span>
                        <span>•</span>
                        <span>Created {formatDate(webhook.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => testWebhookMutation.mutate(webhook.id)}
                      disabled={testWebhookMutation.isLoading}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                      disabled={deleteWebhookMutation.isLoading}
                    >
                      <Trash2 className="w-4 h-4 text-accent-error" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="px-2 py-1 bg-accent-primary/10 text-accent-primary text-xs rounded-md"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateTokenModal
        isOpen={showCreateTokenModal}
        onClose={() => setShowCreateTokenModal(false)}
        onSubmit={createTokenMutation.mutateAsync}
        isLoading={createTokenMutation.isLoading}
      />

      <CreateWebhookModal
        isOpen={showCreateWebhookModal}
        onClose={() => setShowCreateWebhookModal(false)}
        onSubmit={createWebhookMutation.mutateAsync}
        isLoading={createWebhookMutation.isLoading}
      />
    </div>
  );
};

export default Integrations;