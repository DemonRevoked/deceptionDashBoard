import React from 'react';
import ComingSoon from '../components/ComingSoon';

const AdminSettings = () => {
  return (
    <ComingSoon
      title="System Settings"
      description="Advanced system configuration and settings management capabilities are currently under development. This platform will provide comprehensive system administration."
      icon="⚙️"
      expectedDate="Q1 2025"
      features={[
        "System configuration",
        "Security policies",
        "Network settings",
        "Performance tuning",
        "Backup configuration",
        "Integration settings"
      ]}
    />
  );
};

export default AdminSettings;
