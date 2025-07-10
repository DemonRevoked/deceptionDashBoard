import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import HomeDashboard from './features/HomeDashboard/HomeDashboard';
import HoneypotPage from './features/Honeypot/HoneypotPage';
import HoneypotSessionDetails from './components/HoneypotSessionDetails';
import LoginPage from './pages/LoginPage';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import './styles/App.css';

function App() {
  // Opt-in to future v7 behavior for React Router to resolve console warnings.
  const future = { v7_startTransition: true, v7_relativeSplatPath: true };

  return (
    <Router future={future}>
      <AuthProvider>
        <div className="app-container">
          <Navigation />
          <main className="content">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedRoute><HomeDashboard /></ProtectedRoute>} />
              <Route path="/honeypot/:id" element={<ProtectedRoute><HoneypotPage /></ProtectedRoute>} />
              <Route path="/sessions/:sessionId" element={<ProtectedRoute><HoneypotSessionDetails /></ProtectedRoute>} />
              <Route path="*" element={<ProtectedRoute><HomeDashboard /></ProtectedRoute>} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

// A separate component to render navigation only when authenticated
function Navigation() {
  const { token, logout } = useAuth();
  const location = useLocation();

  // Don't show navigation on the login page
  if (!token || location.pathname === '/login') {
    return null;
  }

  return (
    <nav className="main-nav">
      <ul>
        <li><NavLink to="/" className={({ isActive }) => isActive ? "active" : ""}>Home</NavLink></li>
        {/* Dynamically add honeypot links here in the future */}
      </ul>
      <button onClick={logout} className="logout-button">Logout</button>
    </nav>
  );
}

export default App;
