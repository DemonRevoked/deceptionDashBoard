import React from 'react';
import ComingSoon from '../components/ComingSoon';

const AdminUsers = () => {
  return (
    <ComingSoon
      title="User Management"
      description="Advanced user management and role-based access control capabilities are currently under development. This platform will provide comprehensive user administration."
      icon="👥"
      expectedDate="Q1 2025"
      features={[
        "User account management",
        "Role-based access control",
        "Permission management",
        "User activity monitoring",
        "Authentication policies",
        "Security compliance"
      ]}
    />
  );
};

export default AdminUsers;
