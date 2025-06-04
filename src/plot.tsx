// /home/riley/projects/caldo-calibration/src/plot.tsx
import React, { useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import './App.css'; // Or your global styles

// Define and export the LineData interface
// This interface describes the data structure for a single line on the plot.
export interface LineData {
    xValues: number[];
    yValues: number[];
    label?: string;       // Optional label for this specific line
    borderColor?: string; // Optional color for this specific line
}

/* How to use:
const multiLineData: LineData[] = [
    { xValues: [1, 2, 3, 4], yValues: [10, 15, 7, 12], label: "Sensor A", borderColor: "rgba(255, 99, 132, 1)" },
    { xValues: [1, 2, 3, 4], yValues: [5, 8, 12, 9], label: "Sensor B", borderColor: "rgba(54, 162, 235, 1)" },
    // Add more LineData objects for more lines
];

<div style={{ width: '500px', height: '300px', marginTop: '20px' }}>
    <Plot dataSets={multiLineData} />
</div>
 */

Chart.register(...registerables);

interface PlotProps {
    dataSets: LineData[]; // The component now accepts an array of LineData objects
}

const Plot: React.FC<PlotProps> = ({ dataSets }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        const chartCanvas = chartRef.current;

        if (chartCanvas) {
            if (chartInstance.current) {
                chartInstance.current.destroy(); // Clear previous chart instance
            }

            const ctx = chartCanvas.getContext('2d');
            if (ctx) {
                // Map each LineData object from the dataSets prop to a Chart.js dataset configuration
                const chartJSDatasets = dataSets.map(dataSet => {
                    // For each line, map its xValues and yValues to {x, y} points
                    const points = dataSet.xValues.map((x, index) => ({ x: x, y: dataSet.yValues[index] }));
                    return {
                        label: dataSet.label || 'Dataset', // Use provided label or a default
                        data: points,
                        borderColor: dataSet.borderColor || `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 1)`, // Use provided color or a random one
                        tension: 0.1, // Adjust for line smoothness
                        fill: false,  // Set to true to fill area under the line
                    };
                });

                chartInstance.current = new Chart(ctx, {
                    type: 'line',
                    data: {
                        datasets: chartJSDatasets, // Pass the array of dataset configurations to Chart.js
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                type: 'linear',
                                title: {
                                    display: true,
                                    text: 'Time (s)'
                                }
                            },
                            y: {
                                type: 'linear',
                                beginAtZero: false, // Adjust as needed
                                title: {
                                    display: true,
                                    text: 'µV/V'
                                }
                            },
                        },
                        plugins: {
                            legend: {
                                display: true, // Ensure legend is displayed
                                position: 'top',
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                            },
                        },
                    },
                });
            }
        }

        // Cleanup function to destroy the chart instance when the component unmounts or dependencies change
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [dataSets]); // Re-run the effect if the dataSets prop changes

    return <canvas ref={chartRef} />;
};

export default Plot;