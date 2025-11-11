import React from 'react';
import { motion } from 'framer-motion';

const StatsCard = ({ title, value, icon: Icon, color, trend, trendValue, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -2 }}
      className="bg-dark-surface1 border border-dark-border rounded-xl p-6 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-text-muted text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              <span className={`text-xs font-medium ${trend === 'up' ? 'text-accent-success' : trend === 'down' ? 'text-accent-error' : 'text-text-muted'}`}>
                {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {trendValue}
              </span>
              <span className="text-text-muted text-xs ml-1">vs last week</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}/20`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCard;