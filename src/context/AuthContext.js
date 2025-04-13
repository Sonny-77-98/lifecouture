import React, { createContext, useState, useEffect } from 'react';
import createAuthAxios from './api';
import axios from 'axios';

export const AuthContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || '';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [api, setApi] = useState(createAuthAxios());
  
  useEffect(() => {
    setApi(createAuthAxios());
  }, [isAuthenticated]);

  useEffect(() => {
    const checkLoggedIn = async () => {
      if (localStorage.getItem('token')) {
        try {
          setAuthToken(localStorage.getItem('token'));
          const res = await axios.get('/api/auth/user');
          
          setUser(res.data);
          setIsAuthenticated(true);
          setIsLoading(false);
        } catch (err) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setUser(null);
          setIsLoading(false);
          setError('Session expired. Please login again.');
        }
      } else {
        setIsLoading(false);
      }
    };

    checkLoggedIn();
  }, []);

  const login = async (username, password) => {
    try {
      console.log('Attempting login with:', { username, password });
      setError(null);
      
      // Use the API_URL from environment variable
      const loginUrl = `/api/auth/login`;
      const res = await axios.post(loginUrl, { username, password });
      
      console.log('Login response:', res.data);
      
      localStorage.setItem('token', res.data.token);
      setAuthToken(res.data.token);
      setUser(res.data.user);
      setIsAuthenticated(true);
      
      return true;
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Login failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };
  
  const setAuthToken = (token) => {
    if (token) {
      axios.defaults.headers.common['x-auth-token'] = token;
    } else {
      delete axios.defaults.headers.common['x-auth-token'];
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        api 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};