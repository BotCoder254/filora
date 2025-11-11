import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { ...state, loading: false, user: action.payload, isAuthenticated: true };
    case 'LOGIN_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false };
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: true };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  });

  useEffect(() => {
    const initAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const user = await authService.getMe();
          dispatch({ type: 'SET_USER', payload: user });
        } catch (error) {
          authService.logout();
        }
      }
    };
    initAuth();
  }, []);

  const login = async (credentials) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const data = await authService.login(credentials);
      dispatch({ type: 'LOGIN_SUCCESS', payload: data.user });
      return data;
    } catch (error) {
      dispatch({ type: 'LOGIN_ERROR', payload: error.response?.data?.message || 'Login failed' });
      throw error;
    }
  };

  const signup = async (userData) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const data = await authService.signup(userData);
      dispatch({ type: 'LOGIN_SUCCESS', payload: data.user });
      return data;
    } catch (error) {
      dispatch({ type: 'LOGIN_ERROR', payload: error.response?.data?.message || 'Signup failed' });
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};