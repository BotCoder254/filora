import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Webhook } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { EVENT_OPTIONS } from '../../services/integrations';

const CreateWebhookModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    url: '',
    events: []
  });

  const handleEventChange = (event) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.url.trim() || formData.events.length === 0) return;

    try {
      await onSubmit(formData);
      setFormData({ url: '', events: [] });
      onClose();
    } catch (error) {
      console.error('Failed to create webhook:', error);
    }
  };

  const handleClose = () => {
    setFormData({ url: '', events: [] });
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
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <h2 className="text-xl font-semibold text-text-primary">Create Webhook</h2>
          <button
            onClick={handleClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <Input
            label="Webhook URL"
            leftIcon={Webhook}
            placeholder="https://your-app.com/webhooks/filora"
            value={formData.url}
            onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
            required
          />

          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">
              Events to Subscribe
            </label>
            <div className="space-y-3">
              {EVENT_OPTIONS.map((event) => (
                <label key={event.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.events.includes(event.value)}
                    onChange={() => handleEventChange(event.value)}
                    className="mt-1 w-4 h-4 text-accent-primary bg-dark-input border-dark-border rounded focus:ring-accent-primary focus:ring-2"
                  />
                  <div>
                    <div className="text-text-primary font-medium">{event.label}</div>
                    <div className="text-sm text-text-muted">{event.description}</div>
                  </div>
                </label>
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
              disabled={!formData.url.trim() || formData.events.length === 0 || isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Webhook'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateWebhookModal;