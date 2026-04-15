import db from "@/api/openClient";

import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      await checkUserAuth();
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error?.message || 'An unexpected error occurred'
      });
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await db.auth.me();
      setUser(currentUser);
      setIsAuthenticated(Boolean(currentUser));
      setAuthError(null);
      setIsLoadingAuth(false);
    } catch (error) {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthError({
        type: 'auth_required',
        message: 'Authentication required'
      });
    }
  };

  const login = async ({ email, password }) => {
    setIsLoadingAuth(true);
    try {
      const result = await db.auth.login(email, password);
      setUser(result?.user || null);
      setIsAuthenticated(Boolean(result?.user));
      setAuthError(null);
      setIsLoadingAuth(false);
      return result;
    } catch (error) {
      const errorType = error?.code === 'pending_approval' ? 'pending_approval' : 'auth_required';
      setAuthError({
        type: errorType,
        message: error?.message || 'Login failed',
      });
      setIsAuthenticated(false);
      setUser(null);
      setIsLoadingAuth(false);
      throw error;
    }
  };

  const register = async ({ full_name, email, password }) => {
    return db.auth.register({ full_name, email, password });
  };

  const forgotPassword = async (email) => {
    return db.auth.forgotPassword(email);
  };

  const resetPassword = async (token, password) => {
    return db.auth.resetPassword(token, password);
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      db.auth.logout(window.location.href);
    } else {
      db.auth.logout();
    }
  };

  const navigateToLogin = () => {
    db.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      login,
      register,
      forgotPassword,
      resetPassword,
      navigateToLogin,
      checkAppState
    }}>
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
