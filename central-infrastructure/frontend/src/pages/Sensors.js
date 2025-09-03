import React from 'react';
import ComingSoon from '../components/ComingSoon';

const Sensors = () => {
  return (
    <ComingSoon
      title="Sensor Management Platform"
      description="Comprehensive sensor management, monitoring, and configuration capabilities are currently under development. This platform will provide centralized control over all security sensors and honeypots."
      icon="📡"
      expectedDate="Q1 2025"
      features={[
        "Centralized sensor management",
        "Real-time sensor monitoring",
        "Automated sensor deployment",
        "Sensor health monitoring",
        "Configuration management",
        "Performance analytics"
      ]}
    />
  );
};

export default Sensors;
