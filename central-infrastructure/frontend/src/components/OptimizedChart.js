import React, { useMemo, memo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Optimized Pie Chart
const OptimizedPieChart = memo(({ data, title, height = 300 }) => {
  const chartData = useMemo(() => {
    if (!data || !data.labels || !data.values) {
      return {
        labels: ['No Data'],
        datasets: [{
          data: [1],
          backgroundColor: ['#334155'],
          borderWidth: 0,
        }]
      };
    }

    return {
      labels: data.labels,
      datasets: [{
        data: data.values,
        backgroundColor: [
          '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
          '#8b5cf6', '#ec4899', '#84cc16', '#f97316',
          '#0ea5e9', '#14b8a6', '#eab308', '#f43f5e'
        ],
        borderColor: '#1e293b',
        borderWidth: 1,
        hoverBorderWidth: 2,
      }]
    };
  }, [data]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#cbd5e1',
          font: { size: 11 },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    animation: {
      duration: 0, // Disable animations for better performance
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  }), []);

  return (
    <div style={{ height: height, position: 'relative' }}>
      <Pie data={chartData} options={options} />
    </div>
  );
});

// Optimized Bar Chart
const OptimizedBarChart = memo(({ data, title, height = 300 }) => {
  const chartData = useMemo(() => {
    if (!data || !data.labels || !data.values) {
      return {
        labels: ['No Data'],
        datasets: [{
          label: 'Events',
          data: [0],
          backgroundColor: ['#334155'],
          borderWidth: 0,
        }]
      };
    }

    return {
      labels: data.labels,
      datasets: [{
        label: data.label || 'Events',
        data: data.values,
        backgroundColor: '#06b6d4',
        borderColor: '#0891b2',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }]
    };
  }, [data]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hide legend for bar charts to save space
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context) => {
            return context[0].label || '';
          },
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#cbd5e1',
          font: { size: 10 }
        },
        grid: {
          color: '#334155',
          lineWidth: 1
        }
      },
      x: {
        ticks: {
          color: '#cbd5e1',
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 0
        },
        grid: {
          display: false // Hide x-axis grid lines
        }
      }
    },
    animation: {
      duration: 0, // Disable animations for better performance
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  }), []);

  return (
    <div style={{ height: height, position: 'relative' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
});

// Loading skeleton for charts
const ChartSkeleton = memo(({ height = 300 }) => (
  <div 
    style={{ 
      height: height, 
      background: 'linear-gradient(90deg, #334155 25%, #475569 50%, #334155 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#cbd5e1',
      fontSize: '0.9rem'
    }}
  >
    Loading chart...
  </div>
));

// Chart container with error boundary
const ChartContainer = memo(({ 
  type, 
  data, 
  title, 
  height = 300, 
  loading = false,
  error = null 
}) => {
  if (loading) {
    return <ChartSkeleton height={height} />;
  }

  if (error) {
    return (
      <div 
        style={{
          height: height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: '#ef4444',
          fontSize: '0.9rem'
        }}
      >
        Error loading chart: {error}
      </div>
    );
  }

  return (
    <div style={{ height: height }}>
      {type === 'pie' ? (
        <OptimizedPieChart data={data} title={title} height={height} />
      ) : (
        <OptimizedBarChart data={data} title={title} height={height} />
      )}
    </div>
  );
});

// Set display names for better debugging
OptimizedPieChart.displayName = 'OptimizedPieChart';
OptimizedBarChart.displayName = 'OptimizedBarChart';
ChartSkeleton.displayName = 'ChartSkeleton';
ChartContainer.displayName = 'ChartContainer';

export { OptimizedPieChart, OptimizedBarChart, ChartSkeleton, ChartContainer };
export default ChartContainer; 