import React from 'react';
import { motion } from 'framer-motion';
import { 
  Home, 
  FolderOpen, 
  Share2, 
  Upload, 
  Settings, 
  LogOut,
  HardDrive,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';

const Sidebar = ({ activeTab, onTabChange }) => {
  const { logout, user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'files', label: 'Files', icon: FolderOpen },
    { id: 'shared-with-me', label: 'Shared with Me', icon: Share2 },
    { id: 'uploads', label: 'Uploads', icon: Upload },
    { id: 'integrations', label: 'API', icon: HardDrive },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col px-4 py-6">
      {/* Logo/Brand */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Filora</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTabChange(item.id)}
              className={`
                w-full flex items-center space-x-4 px-4 py-3 rounded-full text-left transition-colors
                ${isActive 
                  ? 'bg-accent-primary/10 text-accent-primary font-semibold' 
                  : 'text-text-primary hover:bg-dark-hover'
                }
              `}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xl hidden xl:block">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>

      {/* Upload Button */}
      <div className="mb-6">
        <Button 
          variant="primary" 
          className="w-full py-3 text-lg font-semibold rounded-full"
          onClick={() => onTabChange('uploads')}
        >
          <Upload className="w-5 h-5 xl:mr-2" />
          <span className="hidden xl:block">Upload</span>
        </Button>
      </div>

      {/* User Profile */}
      <div className="mt-auto">
        <div className="flex items-center space-x-3 p-3 hover:bg-dark-hover rounded-full transition-colors cursor-pointer">
          <div className="w-10 h-10 bg-accent-primary rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-medium">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0 hidden xl:block">
            <p className="text-text-primary font-medium truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-text-muted text-sm truncate">{user?.email}</p>
          </div>
          <div className="hidden xl:block">
            <MoreHorizontal className="w-5 h-5 text-text-muted" />
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={logout}
          className="w-full flex items-center space-x-4 px-4 py-3 rounded-full text-left transition-colors text-text-secondary hover:text-accent-error hover:bg-dark-hover mt-2"
        >
          <LogOut className="w-6 h-6" />
          <span className="text-xl hidden xl:block">Sign Out</span>
        </motion.button>
      </div>
    </div>
  );
};

export default Sidebar;