import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthenticatedLayout from './layouts/authenticated/AuthenticatedLayout';
import AuthPage from './pages/auth/AuthPage';
import './index.css';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="dark min-h-screen bg-dark-bg">
            <Routes>
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <AuthPage />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/files" 
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/shared" 
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/shared-with-me" 
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/uploads" 
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/integrations" 
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout />
                  </ProtectedRoute>
                } 
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;