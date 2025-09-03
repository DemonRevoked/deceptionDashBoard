import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import TopBar from '../components/layout/TopBar';

import NotificationCenter from '../components/layout/NotificationCenter';
import Overview from '../pages/Overview';
import Threats from '../pages/Threats';
import AttackDetail from '../pages/AttackDetail';
import HoneypotPage from '../features/Honeypot/HoneypotPage';
import HoneypotSessionDetails from '../features/Sessions/HoneypotSessionDetails';
import OTDashboard from '../features/OTHoneypots/OTDashboard';
import HoneypotControl from '../pages/HoneypotControl';
import HoneypotStatus from '../pages/HoneypotStatus';
import HoneypotManagement from '../pages/HoneypotManagement';

// Coming Soon Pages
import Intelligence from '../pages/Intelligence';
import IntelligenceAnalysis from '../pages/IntelligenceAnalysis';
import IntelligencePatterns from '../pages/IntelligencePatterns';
import IntelligenceAttribution from '../pages/IntelligenceAttribution';
import Sensors from '../pages/Sensors';
import SensorsClients from '../pages/SensorsClients';
import SensorsNetwork from '../pages/SensorsNetwork';
import Operations from '../pages/Operations';
import OperationsLogs from '../pages/OperationsLogs';
import Reports from '../pages/Reports';
import Admin from '../pages/Admin';
import AdminUsers from '../pages/AdminUsers';
import AdminSettings from '../pages/AdminSettings';
import AdminAudit from '../pages/AdminAudit';

// Threats Sub-sections
import ThreatsIOCs from '../pages/ThreatsIOCs';
import ThreatsTTPs from '../pages/ThreatsTTPs';
import ThreatsCampaigns from '../pages/ThreatsCampaigns';

import './MainLayout.css';

const MainLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  return (
    <div className="main-layout">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <TopBar onNotificationToggle={() => setNotificationOpen(!notificationOpen)} />
        
        <main className="content-area">
          <Routes>
            {/* Main Dashboard */}
            <Route path="/" element={<Overview />} />
            
            {/* Threats */}
            <Route path="/threats" element={<Threats />} />
            <Route path="/threats/*" element={<Threats />} />
            <Route path="/threats/alerts" element={<Threats />} />
            <Route path="/threats/iocs" element={<ThreatsIOCs />} />
            <Route path="/threats/ttps" element={<ThreatsTTPs />} />
            <Route path="/threats/campaigns" element={<ThreatsCampaigns />} />
            <Route path="/attack/:ip" element={<AttackDetail />} />
            
            {/* Honeypots */}
            <Route path="/honeypot/:id" element={<HoneypotPage />} />
            <Route path="/sessions/:sessionId" element={<HoneypotSessionDetails />} />
            <Route path="/operations/control" element={<HoneypotControl />} />
            <Route path="/operations/status" element={<HoneypotStatus />} />
            <Route path="/sensors/honeypots" element={<HoneypotManagement />} />
            <Route path="/sensors/ot" element={<OTDashboard />} />
            
            {/* Intelligence - Coming Soon */}
            <Route path="/intelligence" element={<Intelligence />} />
            <Route path="/intelligence/analysis" element={<IntelligenceAnalysis />} />
            <Route path="/intelligence/patterns" element={<IntelligencePatterns />} />
            <Route path="/intelligence/attribution" element={<IntelligenceAttribution />} />
            
            {/* Sensors - Coming Soon */}
            <Route path="/sensors" element={<Sensors />} />
            <Route path="/sensors/clients" element={<SensorsClients />} />
            <Route path="/sensors/network" element={<SensorsNetwork />} />
            
            {/* Operations - Coming Soon */}
            <Route path="/operations" element={<Operations />} />
            <Route path="/operations/logs" element={<OperationsLogs />} />
            
            {/* Reports - Coming Soon */}
            <Route path="/reports" element={<Reports />} />
            
            {/* Admin - Coming Soon */}
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/audit" element={<AdminAudit />} />
            
            {/* Default fallback */}
            <Route path="*" element={<Overview />} />
          </Routes>
        </main>
      </div>

      <NotificationCenter 
        isOpen={notificationOpen} 
        onClose={() => setNotificationOpen(false)} 
      />
    </div>
  );
};

export default MainLayout;
