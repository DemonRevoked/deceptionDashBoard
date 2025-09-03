import React from 'react';
import ComingSoon from '../components/ComingSoon';

const SensorsClients = () => {
  return (
    <ComingSoon
      title="Client Management"
      description="Advanced client sensor management and monitoring capabilities are currently under development. This platform will provide comprehensive control over distributed sensors."
      icon="💻"
      expectedDate="Q1 2025"
      features={[
        "Client sensor deployment",
        "Remote configuration",
        "Health monitoring",
        "Performance analytics",
        "Automated updates",
        "Centralized management"
      ]}
    />
  );
};

export default SensorsClients;
