import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle, Copy, Check, Key } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { SCOPE_OPTIONS, EXPIRY_OPTIONS } from '../../services/integrations';

const CreateTokenModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    scopes: [],
    expires_at: null
  });
  const [showSecret, setShowSecret] = useState(false);
  const [secretData, setSecretData] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleScopeChange = (scope) => {
    setFormData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope]
    }));
  };

  const handleExpiryChange = (days) => {
    const expires_at = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;
    setFormData(prev => ({ ...prev, expires_at }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.scopes.length === 0) return;

    try {
      const result = await onSubmit(formData);
      setSecretData(result);
      setShowSecret(true);
    } catch (error) {
      console.error('Failed to create token:', error);
    }
  };

  const copyToClipboard = async () => {
    if (secretData?.secret) {
      await navigator.clipboard.writeText(secretData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', scopes: [], expires_at: null });
    setShowSecret(false);
    setSecretData(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-dark-surface1 border border-dark-border rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        {!showSecret ? (
          <>
            <div className="flex items-center justify-between p-6 border-b border-dark-border">
              <h2 className="text-xl font-semibold text-text-primary">Create API Token</h2>
              <button
                onClick={handleClose}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <Input
                label="Token Name"
                leftIcon={Key}
                placeholder="e.g., Production API, Mobile App"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />

              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  Scopes
                </label>
                <div className="space-y-3">
                  {SCOPE_OPTIONS.map((scope) => (
                    <label key={scope.value} className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.scopes.includes(scope.value)}
                        onChange={() => handleScopeChange(scope.value)}
                        className="mt-1 w-4 h-4 text-accent-primary bg-dark-input border-dark-border rounded focus:ring-accent-primary focus:ring-2"
                      />
                      <div>
                        <div className="text-text-primary font-medium">{scope.label}</div>
                        <div className="text-sm text-text-muted">{scope.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  Expiration
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {EXPIRY_OPTIONS.map((option) => (
                    <button
                      key={option.value || 'never'}
                      type="button"
                      onClick={() => handleExpiryChange(option.value)}
                      className={`p-3 text-sm rounded-lg border transition-colors ${
                        (formData.expires_at === null && option.value === null) ||
                        (formData.expires_at && option.value)
                          ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                          : 'border-dark-border bg-dark-input text-text-secondary hover:border-dark-border-hover'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="secondary" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!formData.name.trim() || formData.scopes.length === 0 || isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Token'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between p-6 border-b border-dark-border">
              <h2 className="text-xl font-semibold text-text-primary">Token Created</h2>
              <button
                onClick={handleClose}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-accent-warning/10 border border-accent-warning/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-accent-warning mt-0.5" />
                  <div>
                    <h3 className="font-medium text-accent-warning">Important!</h3>
                    <p className="text-sm text-text-secondary mt-1">
                      This is the only time you'll see this token. Copy it now and store it securely.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  API Token
                </label>
                <div className="relative">
                  <div className="bg-dark-input border border-dark-border rounded-lg p-4 font-mono text-sm text-text-primary break-all">
                    {secretData?.secret}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="absolute top-2 right-2 p-2 text-text-muted hover:text-text-primary transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-accent-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-text-muted">Name:</span>
                  <div className="text-text-primary font-medium">{secretData?.name}</div>
                </div>
                <div>
                  <span className="text-text-muted">Scopes:</span>
                  <div className="text-text-primary font-medium">{secretData?.scopes?.join(', ')}</div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="primary" onClick={handleClose}>
                  Done
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default CreateTokenModal;