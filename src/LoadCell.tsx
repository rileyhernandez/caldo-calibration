import { useState, useRef,  } from "react"; // Added useRef and useEffect
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { useNavigate } from "react-router";
import {dropScale, Duration, durationFromMillis, sleepForDenoise} from "./utilities/utils.ts";
import {MotorControls} from "./utilities/MotorControls.tsx";
import Plot, {LineData} from "./plot.tsx";

function App() {
    const [currentStatus, updateStatus] = useState("");
    const [samples, updateSamples] = useState(100);
    const [samplePeriod, updateSamplePeriod] = useState(40); // Assuming this is in milliseconds

    const [progress, setProgress] = useState(0);
    const [isPlotting, setIsPlotting] = useState(false);
    const progressInterval = useRef<number | null>(null);
    const [plotDataSets, setPlotDataSets] = useState<LineData[]>([]);

    const navigate = useNavigate();

    // const navigate = useNavigate();

    interface LoadCellDataRequest {
        samples: number,
        sample_period: Duration
    }

    async function plotData(dataRequest: LoadCellDataRequest) {
        updateStatus("Conducting trial...");
        await sleepForDenoise();

        const totalTime = dataRequest.samples * (dataRequest.sample_period.secs + dataRequest.sample_period.nanos / 1_000_000_000) * 1000;

        setIsPlotting(true);
        setProgress(0);

        const steps = 500;
        const increment = 100 / steps;
        const intervalDuration = totalTime > 0 ? totalTime / steps : 50; // Prevent division by zero

        return new Promise<{ readings: number[]; times: { secs: number; nanos: number }[] }>((_resolve, reject) => {
            progressInterval.current = window.setInterval(() => {
                setProgress(prevProgress => {
                    const newProgress = prevProgress + increment;
                    if (newProgress >= 100) {
                        if (progressInterval.current !== null) {
                            window.clearInterval(progressInterval.current);
                        }
                        return 100;
                    }
                    return newProgress;
                });
            }, intervalDuration);

            invoke("plot_lc", { dataRequest })
                .then((result: unknown) => {
                    if (progressInterval.current !== null) {
                        window.clearInterval(progressInterval.current);
                    }
                    // Check if the result is an array
                    if (Array.isArray(result)) {
                        const newLines: LineData[] = [];
                        let allDataValid = true;

                        for (let i = 0; i < result.length; i++) {
                            const item = result[i];
                            if (typeof item === 'object' && item !== null && 'readings' in item && Array.isArray((item as any).readings) && 'times' in item && Array.isArray((item as any).times)) {
                                const typedItem = item as { readings: number[]; times: { secs: number; nanos: number }[] };
                                const newXValues = typedItem.times.map(obj => obj.secs + obj.nanos * 1e-9);
                                const newYValues = typedItem.readings.map((reading) => reading*10**6); // Convert to microvolts
                                newLines.push({
                                    xValues: newXValues,
                                    yValues: newYValues,
                                    label: `Load Cell ${i}` // Optional: Add a label for each line
                                });
                            } else {
                                allDataValid = false;
                                break;
                            }
                        }

                        if (allDataValid) {
                            setPlotDataSets(newLines); // Set all new lines for the plot
                            updateStatus("Data logged!");
                            // Resolve with the array of typed results or the first one, depending on your needs.
                            // For now, resolving with the whole array.
                            // resolve(result as { readings: number[]; times: { secs: number; nanos: number }[] }[]);
                        } else {
                            updateStatus("Unexpected data format received in array!");
                            console.error("Invalid item in result array:", result);
                            reject("Unexpected data format in array");
                        }

                    } else {
                        updateStatus("Unexpected data format received (expected an array)!");
                        console.error("Result is not an array:", result);
                        reject("Unexpected data format (expected an array)");
                    }
                })
                .catch(error => {
                    if (progressInterval.current !== null) {
                        window.clearInterval(progressInterval.current);
                    }
                    updateStatus(String(error));
                    reject(error);
                })
                .finally(() => {
                    setIsPlotting(false);
                    setProgress(100); // Ensure progress bar completes
                });
        });
    }

    return (
        <main className={`app-container`}>
            <header>
                <h1>Raw Load Cell Readings</h1>
                {/*<p className="subtitle">Calibrate scale</p>*/}
            </header>

            {isPlotting && (
                <div className="loading-bar-container">
                    <div className="loading-bar" style={{ width: `${progress}%` }}></div>
                </div>
            )}

            <MotorControls updateStatus={updateStatus} isDisabled={false} showStepsInput={true}/>

            <section className="controls">
                <div className="button-grid">
                    <button onClick={() => plotData({samples: samples, sample_period: durationFromMillis(samplePeriod)})} disabled={isPlotting}>Run Trial</button>
                </div>
            </section>

            <section className="inputs">
                <div className="input-group">
                    <label htmlFor="samples">Samples:</label>
                    <input
                        type="number"
                        id="samples"
                        value={samples}
                        step={10_000}
                        onChange={(e) => updateSamples(parseInt(e.target.value))}
                        disabled={isPlotting}
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="samplePeriod">Sample Period (ms):</label>
                    <input
                        type="number"
                        id="samplePeriod"
                        value={samplePeriod}
                        step={5}
                        onChange={(e) => updateSamplePeriod(parseInt(e.target.value))}
                        disabled={isPlotting}
                    />
                </div>
            </section>

            <section className="data-display">
                <div className="data-item">
                    <strong>Status:</strong> {currentStatus}
                </div>
            </section>

            <section className="plot-container">
                <h2>Readings Data</h2> {/* Changed title for clarity */}
                <div style={{ width: '100%', maxWidth: '600px', height: '700px' }}>
                    {/* Updated Plot component usage */}
                    <Plot dataSets={plotDataSets} />
                </div>
            </section>
            <section className="controls">
                <div className="button-grid">
                    <button onClick={async () => {
                        await dropScale(updateStatus);
                        navigate("/")
                    }}>Go Back</button>
                </div>
            </section>
        </main>
    );
}

export default App;