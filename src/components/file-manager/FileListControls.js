import React from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Grid3X3, 
  List,
  SortAsc,
  SortDesc,
  Filter,
  X
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

const FileListControls = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  selectedType,
  onTypeChange,
  selectedCount,
  onClearSelection
}) => {
  const sortOptions = [
    { value: 'name', label: 'Name A-Z', icon: SortAsc },
    { value: '-name', label: 'Name Z-A', icon: SortDesc },
    { value: '-modified_at', label: 'Recently Modified', icon: SortDesc },
    { value: 'modified_at', label: 'Oldest First', icon: SortAsc },
    { value: '-size_bytes', label: 'Largest First', icon: SortDesc },
    { value: 'size_bytes', label: 'Smallest First', icon: SortAsc },
  ];

  const typeFilters = [
    { value: '', label: 'All Files', count: null },
    { value: 'image', label: 'Images', count: null },
    { value: 'video', label: 'Videos', count: null },
    { value: 'document', label: 'Documents', count: null },
    { value: 'other', label: 'Other', count: null },
  ];

  const currentSort = sortOptions.find(option => option.value === sortBy);

  return (
    <div className="space-y-4">
      {/* Selection Bar */}
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-accent-primary/10 border border-accent-primary/20 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-accent-primary font-medium">
                {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
              </span>
              <div className="flex space-x-2">
                <Button variant="secondary" size="sm">
                  Download
                </Button>
                <Button variant="secondary" size="sm">
                  Move
                </Button>
                <Button variant="secondary" size="sm">
                  Share
                </Button>
                <Button variant="ghost" size="sm">
                  Delete
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Main Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0 lg:space-x-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-4">
          {/* Type Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-text-muted" />
            <select
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value)}
              className="bg-dark-input border border-dark-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              {typeFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-dark-input border border-dark-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode */}
          <div className="flex items-center space-x-1 bg-dark-surface1 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('grid')}
              className="px-3"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              className="px-3"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {(selectedType || searchQuery) && (
        <div className="flex items-center space-x-2">
          <span className="text-text-muted text-sm">Active filters:</span>
          {selectedType && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center space-x-1 bg-accent-primary/20 text-accent-primary px-2 py-1 rounded-full text-xs"
            >
              <span>{typeFilters.find(f => f.value === selectedType)?.label}</span>
              <button onClick={() => onTypeChange('')}>
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
          {searchQuery && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center space-x-1 bg-accent-secondary/20 text-accent-secondary px-2 py-1 rounded-full text-xs"
            >
              <span>"{searchQuery}"</span>
              <button onClick={() => onSearchChange('')}>
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileListControls;