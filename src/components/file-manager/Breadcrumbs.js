import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs = ({ breadcrumbs, onNavigate }) => {
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm">
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.id || 'root'}>
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate(crumb.id)}
            className={`
              flex items-center space-x-1 px-2 py-1 rounded-md transition-colors truncate
              ${index === breadcrumbs.length - 1
                ? 'text-text-primary font-medium cursor-default'
                : 'text-text-secondary hover:text-text-primary hover:bg-dark-hover cursor-pointer'
              }
            `}
            disabled={index === breadcrumbs.length - 1}
          >
            {index === 0 && <Home className="w-4 h-4 flex-shrink-0" />}
            <span className="truncate max-w-32">{crumb.name}</span>
          </motion.button>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;