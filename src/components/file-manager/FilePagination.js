import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Loader2 } from 'lucide-react';
import Button from '../ui/Button';

const FilePagination = ({ 
  hasMore, 
  isLoading, 
  onLoadMore, 
  totalCount,
  currentCount,
  pageSize,
  onPageSizeChange 
}) => {
  const pageSizeOptions = [25, 50, 100];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0 py-4">
      {/* Results Info */}
      <div className="flex items-center space-x-4 text-sm text-text-secondary">
        <span>
          Showing {currentCount} {totalCount && `of ${totalCount}`} items
        </span>
        
        {/* Page Size Selector */}
        <div className="flex items-center space-x-2">
          <span>Show:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-dark-input border border-dark-border rounded px-2 py-1 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span>per page</span>
        </div>
      </div>

      {/* Load More Button */}
      {hasMore && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="secondary"
            onClick={onLoadMore}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>{isLoading ? 'Loading...' : 'Load More'}</span>
          </Button>
        </motion.div>
      )}

      {/* End of Results */}
      {!hasMore && currentCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-text-muted"
        >
          End of results
        </motion.div>
      )}
    </div>
  );
};

export default FilePagination;