import React from 'react';
import ComingSoon from '../components/ComingSoon';

const Reports = () => {
  return (
    <ComingSoon
      title="Advanced Reporting Platform"
      description="Comprehensive reporting, analytics, and visualization capabilities are currently under development. This platform will provide detailed insights and customizable reports."
      icon="📋"
      expectedDate="Q2 2025"
      features={[
        "Customizable report templates",
        "Advanced data visualization",
        "Automated report generation",
        "Trend analysis and forecasting",
        "Executive dashboards",
        "Export and sharing capabilities"
      ]}
    />
  );
};

export default Reports;
