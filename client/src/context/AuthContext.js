/**
 * Auth Context
 */

import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Set token in API headers
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const response = await api.get('/auth/me');
          setUser(response.data.data);
          setToken(storedToken);
        } catch (error) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { user, token } = response.data.data;
    
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
    
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore error
    }
    
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data) => {
    const response = await api.put('/auth/profile', data);
    setUser(prev => ({ ...prev, ...response.data.data }));
    return response.data.data;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateProfile,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
