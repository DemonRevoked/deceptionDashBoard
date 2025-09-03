import React from 'react';
import ComingSoon from '../components/ComingSoon';

const Admin = () => {
  return (
    <ComingSoon
      title="Administration Center"
      description="Advanced administration, user management, and system configuration capabilities are currently under development. This platform will provide comprehensive administrative control."
      icon="👑"
      expectedDate="Q1 2025"
      features={[
        "User and role management",
        "System configuration",
        "Security policy management",
        "Audit logging and monitoring",
        "Backup and recovery",
        "Performance tuning"
      ]}
    />
  );
};

export default Admin;
