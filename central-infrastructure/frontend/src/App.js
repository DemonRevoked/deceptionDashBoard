import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import MainLayout from './layouts/MainLayout';
import Overview from './pages/Overview';
import Threats from './pages/Threats';
import AttackDetail from './pages/AttackDetail';
import HoneypotPage from './features/Honeypot/HoneypotPage';
import HoneypotSessionDetails from './features/Sessions/HoneypotSessionDetails';
import OTDashboard from './features/OTHoneypots/OTDashboard';
import LoginPage from './pages/LoginPage';
import HoneypotControl from './pages/HoneypotControl';
import HoneypotStatus from './pages/HoneypotStatus';
import HoneypotManagement from './pages/HoneypotManagement';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { HealthMonitoringProvider } from './contexts/HealthMonitoringContext';

import { refreshApiConfiguration } from './api';
import './styles/App.css';

function App() {
  // Opt-in to future v7 behavior for React Router to resolve console warnings.
  const future = { v7_startTransition: true, v7_relativeSplatPath: true };

  // Refresh API configuration when app loads
  useEffect(() => {
    // Small delay to ensure window.location is available
    const timer = setTimeout(() => {
      refreshApiConfiguration();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <Router future={future}>
      <AuthProvider>
        <HealthMonitoringProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/*" element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              } />
            </Routes>
            
            {/* Toast notifications */}
            <Toaster
              position="top-right"
              reverseOrder={false}
              gutter={8}
              containerClassName=""
              containerStyle={{}}
              toastOptions={{
                // Define default options
                className: '',
                duration: 4000,
                style: {
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                },
                // Default options for specific types
                success: {
                  duration: 3000,
                  theme: {
                    primary: '#22c55e',
                    secondary: '#dcfce7',
                  },
                },
                error: {
                  duration: 5000,
                  theme: {
                    primary: '#ef4444',
                    secondary: '#fef2f2',
                  },
                },
              }}
            />
        </HealthMonitoringProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
