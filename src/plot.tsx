// /home/riley/projects/caldo-calibration/src/plot.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import './App.css'; // Or your global styles

// Define and export the LineData interface
export interface LineData {
    xValues: number[];
    yValues: number[];
    label?: string;
    borderColor?: string;
}

// Interface for the statistics to be displayed in the table
interface DatasetStats {
    label: string;
    median: number;
    range: number; // Changed from max and min to range
}

Chart.register(...registerables);

interface PlotProps {
    dataSets: LineData[];
    xAxisUnits?: string;
    yAxisUnits?: string;
}

const calculateMedian = (arr: number[]): number => {
    if (arr.length === 0) return NaN;
    const sortedArr = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sortedArr.length / 2);
    return sortedArr.length % 2 === 0 ? (sortedArr[mid - 1] + sortedArr[mid]) / 2 : sortedArr[mid];
};

const Plot: React.FC<PlotProps> = ({ dataSets, xAxisUnits = 'Time (s)', yAxisUnits = 'µV/V' }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);
    // State to hold the calculated statistics for the table
    const [statsTableData, setStatsTableData] = useState<DatasetStats[]>([]);

    useEffect(() => {
        const chartCanvas = chartRef.current;
        const newStats: DatasetStats[] = [];

        if (chartCanvas) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }

            const ctx = chartCanvas.getContext('2d');
            if (ctx) {
                const chartJSDatasets = dataSets.map(dataSet => {
                    if (dataSet.xValues.length === 0 || dataSet.yValues.length === 0) {
                        newStats.push({
                            label: dataSet.label || 'Unnamed Dataset',
                            median: NaN,
                            range: NaN, // Set range to NaN for empty/invalid data
                        });
                        return null;
                    }

                    const points = dataSet.xValues.map((x, index) => ({ x: x, y: dataSet.yValues[index] }));
                    const datasetLabel = dataSet.label || `Dataset ${newStats.length + 1}`;

                    // Calculate min, max, median for the current dataset's yValues
                    const minY = Math.min(...dataSet.yValues);
                    const maxY = Math.max(...dataSet.yValues);
                    const medianY = calculateMedian(dataSet.yValues);
                    const rangeY = maxY - minY; // Calculate range

                    // Add calculated stats to our state for the table
                    newStats.push({
                        label: datasetLabel,
                        median: medianY,
                        range: rangeY, // Store range
                    });

                    return {
                        label: datasetLabel,
                        data: points,
                        borderColor: dataSet.borderColor || `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 1)`,
                        tension: 0.1,
                        fill: false,
                        pointRadius: 0,
                        borderWidth: 2,
                    };
                }).filter(ds => ds !== null);

                setStatsTableData(newStats);

                if (chartJSDatasets.length > 0) {
                    chartInstance.current = new Chart(ctx, {
                        type: 'line',
                        data: {
                            datasets: chartJSDatasets as any[],
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                x: {
                                    type: 'linear',
                                    title: { display: true, text: xAxisUnits }
                                },
                                y: {
                                    type: 'linear',
                                    beginAtZero: false,
                                    title: { display: true, text: yAxisUnits }
                                },
                            },
                            plugins: {
                                legend: { display: true, position: 'top' },
                                tooltip: { mode: 'index', intersect: false },
                            },
                        },
                    });
                } else {
                    // Optionally clear the canvas if there are no datasets to plot
                    // ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
                }
            }
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [dataSets, xAxisUnits, yAxisUnits]);

    return (
        <div>
            <div style={{ width: '100%', height: '300px' }}> {/* Adjust height as needed */}
                <canvas ref={chartRef} />
            </div>
            {statsTableData.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                    <h4>Dataset Statistics</h4>
                    <table className="stats-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Dataset Label</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{`Median [${yAxisUnits}]`}</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{`Range [${yAxisUnits}]`}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {statsTableData.map((stat, index) => (
                            <tr key={index}>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{stat.label}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{isNaN(stat.median) ? 'N/A' : stat.median.toFixed(2)}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{isNaN(stat.range) ? 'N/A' : stat.range.toFixed(2)}</td> {/* Display range */}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Plot;