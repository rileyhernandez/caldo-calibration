// Plot.tsx
import React, { useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import './App.css'; // Or your global styles

/* How to use:
<div style={{ width: '500px', height: '300px', marginTop: '20px' }}>
    <Plot dataPoints={plotDataPoints} />
</div>
 */

Chart.register(...registerables);

interface PlotProps {
    xValues: number[];
    yValues: number[];
    label?: string; // Optional label for the dataset
    borderColor?: string; // Optional line color
}

const Plot: React.FC<PlotProps> = ({ xValues, yValues, label = 'Data', borderColor = 'blue' }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        const chartCanvas = chartRef.current;

        if (chartCanvas) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }

            const ctx = chartCanvas.getContext('2d');
            if (ctx) {
                // Ensure x and y values have the same length
                const dataPoints = xValues.map((x, index) => ({ x: x, y: yValues[index] }));

                chartInstance.current = new Chart(ctx, {
                    type: 'line',
                    data: {
                        datasets: [
                            {
                                label: label,
                                data: dataPoints,
                                borderColor: borderColor,
                                tension: 0.4,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                type: 'linear',
                            },
                            y: {
                                type: 'linear',
                                beginAtZero: false,
                            },
                        },
                    },
                });
            }
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [xValues, yValues, label, borderColor]);

    return <canvas ref={chartRef} />;
};

export default Plot;