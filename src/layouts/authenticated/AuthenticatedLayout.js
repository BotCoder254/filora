import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';
import Dashboard from '../../pages/dashboard/Dashboard';
import MyFiles from '../../pages/files/MyFiles';
import SharedFiles from '../../pages/files/SharedFiles';
import SharedWithMe from '../../pages/files/SharedWithMe';
import Uploads from '../../pages/files/Uploads';
import Integrations from '../../pages/dashboard/Integrations';
import Settings from '../../pages/dashboard/Settings';

const AuthenticatedLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const getActiveTabFromPath = (pathname) => {
    switch (pathname) {
      case '/dashboard': return 'dashboard';
      case '/files': return 'files';
      case '/shared': return 'shared';
      case '/shared-with-me': return 'shared-with-me';
      case '/uploads': return 'uploads';
      case '/integrations': return 'integrations';
      case '/settings': return 'settings';
      default: return 'dashboard';
    }
  };
  
  const activeTab = getActiveTabFromPath(location.pathname);
  
  const handleTabChange = (tabId) => {
    const pathMap = {
      'dashboard': '/dashboard',
      'files': '/files',
      'shared': '/shared',
      'shared-with-me': '/shared-with-me',
      'uploads': '/uploads',
      'integrations': '/integrations',
      'settings': '/settings'
    };
    navigate(pathMap[tabId] || '/dashboard');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'files':
        return <MyFiles />;
      case 'shared':
        return <SharedFiles />;
      case 'shared-with-me':
        return <SharedWithMe />;
      case 'uploads':
        return <Uploads />;
      case 'integrations':
        return <Integrations />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-screen bg-dark-bg flex">
      {/* Left Sidebar - Fixed width */}
      <div className="w-64 xl:w-80 flex-shrink-0">
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
      
      {/* Main Content - Flexible width */}
      <div className="flex-1 min-w-0 border-x border-dark-border">
        <main className="h-full overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      
      {/* Right Panel - Fixed width, hidden on smaller screens */}
      <div className="hidden lg:block w-80 xl:w-96 flex-shrink-0">
        <RightPanel activeTab={activeTab} />
      </div>
    </div>
  );
};

export default AuthenticatedLayout;