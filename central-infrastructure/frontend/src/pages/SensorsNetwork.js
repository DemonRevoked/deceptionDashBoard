import React from 'react';
import ComingSoon from '../components/ComingSoon';

const SensorsNetwork = () => {
  return (
    <ComingSoon
      title="Network Sensors"
      description="Advanced network sensor management and monitoring capabilities are currently under development. This platform will provide comprehensive network security monitoring."
      icon="🌐"
      expectedDate="Q1 2025"
      features={[
        "Network traffic monitoring",
        "Intrusion detection",
        "Traffic analysis",
        "Anomaly detection",
        "Real-time alerts",
        "Network mapping"
      ]}
    />
  );
};

export default SensorsNetwork;
