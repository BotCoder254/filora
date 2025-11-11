import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Copy, Link2, Mail, Users, Settings, 
  Calendar, Lock, Eye, Edit, Trash2, 
  Check, AlertCircle, ExternalLink, Code
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import api from '../../services/api';

const ShareModal = ({ fileId, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('link');
  const [linkSettings, setLinkSettings] = useState({
    permission: 'viewer',
    expires_at: '',
    password: ''
  });
  const [userInvite, setUserInvite] = useState({
    email: '',
    permission: 'viewer'
  });
  const [copiedText, setCopiedText] = useState('');
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const queryClient = useQueryClient();

  // Fetch file details
  const { data: file } = useQuery({
    queryKey: ['file', fileId],
    queryFn: async () => {
      const response = await api.get(`/files/${fileId}/`);
      return response.data;
    },
    enabled: !!fileId
  });

  // Fetch shares and invites
  const { data: sharesData, isLoading: sharesLoading } = useQuery({
    queryKey: ['shares', fileId],
    queryFn: async () => {
      const response = await api.get(`/files/${fileId}/shares/`);
      return response.data;
    },
    enabled: !!fileId
  });

  // Fetch embed code
  const { data: embedData } = useQuery({
    queryKey: ['embed', fileId],
    queryFn: async () => {
      const response = await api.get(`/files/${fileId}/embed/`);
      return response.data;
    },
    enabled: !!fileId && showEmbedCode
  });

  // Create share mutation
  const createShareMutation = useMutation({
    mutationFn: async (shareData) => {
      const response = await api.post(`/files/${fileId}/share/`, shareData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares', fileId] });
      queryClient.invalidateQueries({ queryKey: ['embed', fileId] });
    }
  });

  // Revoke share mutation
  const revokeShareMutation = useMutation({
    mutationFn: async (shareId) => {
      await api.delete(`/files/${fileId}/shares/${shareId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares', fileId] });
    }
  });

  // Cancel invite mutation
  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId) => {
      await api.delete(`/files/${fileId}/invites/${inviteId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares', fileId] });
    }
  });

  const publicShare = sharesData?.shares?.find(share => share.share_type === 'public');
  const userShares = sharesData?.shares?.filter(share => share.share_type === 'user') || [];
  const invites = sharesData?.invites || [];

  const handleCreatePublicLink = async () => {
    await createShareMutation.mutateAsync({
      type: 'public',
      ...linkSettings
    });
  };

  const handleInviteUser = async () => {
    if (!userInvite.email.trim()) return;
    
    await createShareMutation.mutateAsync({
      type: 'user',
      target_email: userInvite.email,
      permission: userInvite.permission
    });
    
    setUserInvite({ email: '', permission: 'viewer' });
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getPermissionIcon = (permission) => {
    switch (permission) {
      case 'viewer': return <Eye className="w-4 h-4" />;
      case 'editor': return <Edit className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const renderPublicLinkTab = () => (
    <div className="space-y-6">
      {/* Public Link Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">Public Link</h3>
          {publicShare && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => revokeShareMutation.mutate(publicShare.id)}
              className="text-accent-error hover:text-accent-error"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Revoke
            </Button>
          )}
        </div>

        {publicShare ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 p-3 bg-dark-surface1 rounded-lg">
              <Link2 className="w-5 h-5 text-accent-primary flex-shrink-0" />
              <input
                type="text"
                value={publicShare.share_url}
                readOnly
                className="flex-1 bg-transparent text-text-primary text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(publicShare.share_url, 'link')}
              >
                {copiedText === 'link' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <div className="flex items-center justify-between text-sm text-text-secondary">
              <span>Permission: {publicShare.permission}</span>
              <span>Expires: {formatDate(publicShare.expires_at)}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Permission
                </label>
                <select
                  value={linkSettings.permission}
                  onChange={(e) => setLinkSettings(prev => ({ ...prev, permission: e.target.value }))}
                  className="w-full bg-dark-input border border-dark-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                >
                  <option value="viewer">Viewer (can view and download)</option>
                  <option value="editor">Editor (can view, download, and comment)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Expires
                </label>
                <input
                  type="date"
                  value={linkSettings.expires_at}
                  onChange={(e) => setLinkSettings(prev => ({ ...prev, expires_at: e.target.value }))}
                  className="w-full bg-dark-input border border-dark-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Password (optional)
              </label>
              <input
                type="password"
                value={linkSettings.password}
                onChange={(e) => setLinkSettings(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Leave empty for no password"
                className="w-full bg-dark-input border border-dark-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
            </div>

            <Button
              variant="primary"
              onClick={handleCreatePublicLink}
              disabled={createShareMutation.isPending}
              className="w-full"
            >
              {createShareMutation.isPending ? 'Creating...' : 'Create Public Link'}
            </Button>
          </div>
        )}
      </div>

      {/* Embed Code Section */}
      <div className="border-t border-dark-border pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Embed Code</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEmbedCode(!showEmbedCode)}
          >
            <Code className="w-4 h-4 mr-2" />
            {showEmbedCode ? 'Hide' : 'Show'} Code
          </Button>
        </div>

        {showEmbedCode && embedData && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Iframe Embed
              </label>
              <div className="flex items-center space-x-2">
                <textarea
                  value={embedData.embed_codes.iframe}
                  readOnly
                  rows={3}
                  className="flex-1 bg-dark-input border border-dark-border rounded-lg px-3 py-2 text-text-primary text-sm font-mono resize-none"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(embedData.embed_codes.iframe, 'iframe')}
                >
                  {copiedText === 'iframe' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Markdown Link
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={embedData.embed_codes.markdown}
                  readOnly
                  className="flex-1 bg-dark-input border border-dark-border rounded-lg px-3 py-2 text-text-primary text-sm font-mono"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(embedData.embed_codes.markdown, 'markdown')}
                >
                  {copiedText === 'markdown' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderCollaboratorsTab = () => (
    <div className="space-y-6">
      {/* Invite User Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Invite Collaborators</h3>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <input
            type="email"
            value={userInvite.email}
            onChange={(e) => setUserInvite(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Enter email address"
            className="flex-1 bg-dark-input border border-dark-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
          <select
            value={userInvite.permission}
            onChange={(e) => setUserInvite(prev => ({ ...prev, permission: e.target.value }))}
            className="bg-dark-input border border-dark-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
          <Button
            variant="primary"
            onClick={handleInviteUser}
            disabled={createShareMutation.isPending || !userInvite.email.trim()}
          >
            {createShareMutation.isPending ? 'Inviting...' : 'Invite'}
          </Button>
        </div>
      </div>

      {/* Current Collaborators */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Current Access</h3>
        
        <div className="space-y-2">
          {userShares.map((share) => (
            <div key={share.id} className="flex items-center justify-between p-3 bg-dark-surface1 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-accent-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {share.target_user_email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-text-primary font-medium">{share.target_user_email}</p>
                  <p className="text-text-secondary text-sm">
                    {share.permission} • Added {formatDate(share.created_at)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 text-text-secondary">
                  {getPermissionIcon(share.permission)}
                  <span className="text-sm capitalize">{share.permission}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeShareMutation.mutate(share.id)}
                  className="text-accent-error hover:text-accent-error"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Pending Invites */}
          {invites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between p-3 bg-dark-surface1 rounded-lg border border-accent-warning">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-accent-warning rounded-full flex items-center justify-center">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-text-primary font-medium">{invite.target_email}</p>
                  <p className="text-accent-warning text-sm">
                    Pending invitation • {invite.permission}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cancelInviteMutation.mutate(invite.id)}
                className="text-accent-error hover:text-accent-error"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {userShares.length === 0 && invites.length === 0 && (
            <div className="text-center py-8 text-text-muted">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No collaborators yet</p>
              <p className="text-sm">Invite people to collaborate on this file</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share "${file?.name}"`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex space-x-1 bg-dark-surface1 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'link'
                ? 'bg-accent-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Public Link</span>
          </button>
          <button
            onClick={() => setActiveTab('collaborators')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'collaborators'
                ? 'bg-accent-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Collaborators</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {sharesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
            </div>
          ) : (
            <>
              {activeTab === 'link' && renderPublicLinkTab()}
              {activeTab === 'collaborators' && renderCollaboratorsTab()}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ShareModal;