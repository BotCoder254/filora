import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, CheckCircle, XCircle } from 'lucide-react';

const UsageStats = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-dark-surface1 border border-dark-border rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-dark-input rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-dark-input rounded"></div>
            <div className="h-3 bg-dark-input rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-surface1 border border-dark-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-dark-border">
        <h3 className="text-lg font-semibold text-text-primary">Usage Summary</h3>
      </div>

      <div className="p-6 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-primary">{stats?.active_tokens || 0}</div>
            <div className="text-sm text-text-muted">Active Tokens</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-primary">{stats?.active_webhooks || 0}</div>
            <div className="text-sm text-text-muted">Active Webhooks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-success">{stats?.webhook_success_rate || 0}%</div>
            <div className="text-sm text-text-muted">Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-text-primary">
              {stats?.token_usage?.reduce((sum, item) => sum + item.count, 0) || 0}
            </div>
            <div className="text-sm text-text-muted">API Calls (7d)</div>
          </div>
        </div>

        {/* Token Usage */}
        {stats?.token_usage?.length > 0 && (
          <div>
            <h4 className="text-text-primary font-medium mb-3 flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Token Usage (Last 7 Days)
            </h4>
            <div className="space-y-2">
              {stats.token_usage.map((usage, index) => (
                <motion.div
                  key={usage.token__name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-dark-input rounded-lg"
                >
                  <span className="text-text-primary font-medium">{usage.token__name}</span>
                  <span className="text-accent-primary font-semibold">{usage.count} calls</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Webhook Deliveries */}
        {stats?.recent_deliveries?.length > 0 && (
          <div>
            <h4 className="text-text-primary font-medium mb-3 flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              Recent Webhook Deliveries
            </h4>
            <div className="space-y-2">
              {stats.recent_deliveries.slice(0, 5).map((delivery, index) => (
                <motion.div
                  key={delivery.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-dark-input rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {delivery.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-accent-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-accent-error" />
                    )}
                    <span className="text-text-primary">{delivery.event}</span>
                  </div>
                  <span className="text-sm text-text-muted">
                    {new Date(delivery.created_at).toLocaleDateString()}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!stats?.token_usage?.length && !stats?.recent_deliveries?.length) && (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted">No usage data available yet</p>
            <p className="text-sm text-text-muted mt-1">
              Create some API tokens and webhooks to see usage statistics
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsageStats;