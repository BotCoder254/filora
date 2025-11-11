import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const UploadTrendsChart = ({ uploadTrends }) => {
  const data = {
    labels: uploadTrends.map(trend => {
      const date = new Date(trend.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Uploads',
        data: uploadTrends.map(trend => trend.uploads),
        borderColor: '#E63946',
        backgroundColor: 'rgba(230, 57, 70, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#E63946',
        pointBorderColor: '#1A1A1A',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#1A1A1A',
        titleColor: '#F3F3F3',
        bodyColor: '#B5B5B5',
        borderColor: '#2E2E2E',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          color: '#2E2E2E',
          borderColor: '#2E2E2E'
        },
        ticks: {
          color: '#7A7A7A',
          maxTicksLimit: 7
        }
      },
      y: {
        grid: {
          color: '#2E2E2E',
          borderColor: '#2E2E2E'
        },
        ticks: {
          color: '#7A7A7A',
          beginAtZero: true,
          precision: 0
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  return (
    <div className="h-64">
      <Line data={data} options={options} />
    </div>
  );
};

export default UploadTrendsChart;