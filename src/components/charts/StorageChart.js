import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const StorageChart = ({ fileTypes, totalSize }) => {
  const data = {
    labels: ['Documents', 'Images', 'Videos', 'Audio', 'Other'],
    datasets: [
      {
        data: [
          fileTypes.documents,
          fileTypes.images,
          fileTypes.videos,
          fileTypes.audio,
          fileTypes.other
        ],
        backgroundColor: [
          '#E63946',
          '#06D6A0',
          '#FFD166',
          '#118AB2',
          '#7A7A7A'
        ],
        borderColor: '#1A1A1A',
        borderWidth: 2,
        cutout: '70%'
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
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const bytes = context.raw;
            const formatSize = (bytes) => {
              const sizes = ['B', 'KB', 'MB', 'GB'];
              if (bytes === 0) return '0 B';
              const i = Math.floor(Math.log(bytes) / Math.log(1024));
              return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
            };
            return `${context.label}: ${formatSize(bytes)}`;
          }
        }
      }
    }
  };

  return (
    <div className="relative h-48">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-text-primary">
            {Math.round((totalSize / (1024 * 1024 * 1024)) * 10) / 10}
          </div>
          <div className="text-sm text-text-muted">GB Used</div>
        </div>
      </div>
    </div>
  );
};

export default StorageChart;