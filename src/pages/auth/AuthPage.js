import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from '../../components/auth/LoginForm';
import SignupForm from '../../components/auth/SignupForm';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { login, signup, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (data) => {
    try {
      await login(data);
      navigate('/dashboard');
    } catch (error) {
      // Error is handled by context
    }
  };

  const handleSignup = async (data) => {
    try {
      await signup(data);
      navigate('/dashboard');
    } catch (error) {
      // Error is handled by context
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-dark-surface1/50" />
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-bold text-text-primary mb-4">
              Welcome to Filora
            </h1>
            <p className="text-xl text-text-secondary mb-8">
              Modern file storage and sharing platform
            </p>
            <div className="space-y-4 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-accent-primary rounded-full" />
                <span className="text-text-secondary">Secure file storage</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-accent-secondary rounded-full" />
                <span className="text-text-secondary">Easy sharing & collaboration</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-accent-warning rounded-full" />
                <span className="text-text-secondary">REST API integration</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {isLogin ? (
              <LoginForm
                key="login"
                onSubmit={handleLogin}
                loading={loading}
                error={error}
                onSwitchToSignup={() => setIsLogin(false)}
              />
            ) : (
              <SignupForm
                key="signup"
                onSubmit={handleSignup}
                loading={loading}
                error={error}
                onSwitchToLogin={() => setIsLogin(true)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;