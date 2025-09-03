import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setAuthToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize token from localStorage to persist login across page refreshes
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const navigate = useNavigate();
  const location = useLocation();

  // This effect synchronizes the token with localStorage and the api client header
  useEffect(() => {
    if (token) {
      localStorage.setItem('authToken', token);
      setAuthToken(token);
    } else {
      localStorage.removeItem('authToken');
      setAuthToken(null);
    }
  }, [token]);

  const login = (newToken) => {
    setToken(newToken);
    // Redirect user to the page they were trying to access, or to the homepage
    const from = location.state?.from?.pathname || '/';
    navigate(from, { replace: true });
  };

  const logout = () => {
    setToken(null);
    navigate('/login');
  };

  const value = { token, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}