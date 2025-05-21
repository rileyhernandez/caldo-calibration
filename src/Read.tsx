import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import Plot from './plot';

function App() {
    interface DataRequest {
        trial: TrialType;
        samples: number;
        sample_period: Duration;
        cutoff_frequency: number | null
    }
    type TrialType =
        | "Raw"
        | "Median"
        | "Filtered";
    interface Duration {
        secs: number;
        nanos: number;
    }

    const [currentStatus, updateStatus] = useState("");
    const [currentWeight, updateWeight] = useState(0);
    const [tare, updateTare] = useState(0);

    const [samples, updateSamples] = useState(0);
    const [samplePeriod, updateSamplePeriod] = useState(40);
    const [cutoffFrequency, updateCutoffFrequency] = useState(0);
    const [phidgetSamplePeriod, updatePhidgetSamplePeriod] = useState(40);

    const [xPlotValues, setXPlotValues] = useState<number[]>([1.0, 2.5, 3, 4]);
    const [yPlotValues, setYPlotValues] = useState<number[]>([0, 3.1, 4.3, 6.1]);

    const [progress, setProgress] = useState(0);
    const [isPlotting, setIsPlotting] = useState(false);
    const progressInterval = useRef<number | null>(null); // Changed type here

    function median(data: number[]): number {
        return data[Math.floor(data.length / 2)]
    }

    async function setPhidgetInterval() {
        try {
            const result: string = await invoke("set_phidget_interval", {samplePeriod: {secs: 0, nanos: phidgetSamplePeriod*1000000}})
            updateStatus(result);
        } catch (e: any) {
            updateStatus(String(e));
        }
    }

    async function plotData(dataRequest: DataRequest) {
        const totalTime = dataRequest.samples * (dataRequest.sample_period.secs + dataRequest.sample_period.nanos / 1_000_000_000) * 1000; // in milliseconds
        updateStatus("Conducting trial...");
        setIsPlotting(true);
        setProgress(0);

        const steps = 500; // Increased number of steps
        const increment = 100 / steps; // Smaller increment per step
        const intervalDuration = totalTime / steps; // Shorter interval duration

        return new Promise<{ readings: number[]; times: { secs: number; nanos: number }[] }>((resolve, reject) => {
            progressInterval.current = window.setInterval(() => {
                setProgress(prevProgress => {
                    const newProgress = prevProgress + increment;
                    if (newProgress >= 100) {
                        window.clearInterval(progressInterval.current!);
                        return 100;
                    }
                    return newProgress;
                });
            }, intervalDuration);

            invoke("plot", { dataRequest })
                .then((result: unknown) => {
                    window.clearInterval(progressInterval.current!);
                    if (typeof result === 'object' && result !== null && 'readings' in result && 'times' in result) {
                        const typedResult = result as { readings: number[]; times: { secs: number; nanos: number }[] };
                        setXPlotValues(typedResult.times.map(obj => obj.secs + obj.nanos * 10**-9));
                        setYPlotValues(typedResult.readings);
                        updateStatus("Data logged!");
                        updateWeight(median(typedResult.readings));
                        setIsPlotting(false);
                        resolve(typedResult);
                    } else {
                        updateStatus("Unexpected data format received!");
                        reject("Unexpected data format");
                    }
                })
        });
    }

    async function filterTrial() {
        let dataRequest: DataRequest = {
            trial: "Filtered",
            samples: samples,
            sample_period: {secs: 0, nanos: samplePeriod*1000000},
            cutoff_frequency: cutoffFrequency,
        }
        await plotData(dataRequest);
    }

    async function rawTrial() {
        let dataRequest: DataRequest = {
            trial: "Raw",
            samples: samples,
            sample_period: {secs: 0, nanos: samplePeriod*1000000},
            cutoff_frequency: null
        }
        await plotData(dataRequest);
    }

    async function checkAppData() {
        try {
            let result: string = await invoke("check_app_data", {});
            updateStatus(result);
        } catch (error: any) {
            updateStatus(String(error))
        }
    }

    useEffect(() => {
        return () => {
            if (progressInterval.current) {
                window.clearInterval(progressInterval.current); // Changed here
            }
        };
    }, []);

    return (
        <main className={`app-container`}>
            <header>
                <h1>Read</h1>
                <p className="subtitle">Weigh scale and diagnose readings.</p>
            </header>

            <section className="controls">
                <div className="button-grid">
                    <button onClick={rawTrial} disabled={isPlotting}>Raw</button>
                    <button onClick={() => {}} disabled={isPlotting}>Median</button>
                    <button onClick={filterTrial} disabled={isPlotting}>Filtered</button>
                    <button onClick={checkAppData} disabled={isPlotting}>Check App Data</button>
                    <button onClick={setPhidgetInterval} disabled={isPlotting}>Set Phidget Interval</button>
                    <button onClick={() => {updateTare(currentWeight)}} disabled={isPlotting}>Tare</button>
                </div>
            </section>

            <section className="inputs">
                <div className="input-group">
                    <label htmlFor="samples">Samples:</label>
                    <input
                        type="number"
                        id="samples"
                        value={samples}
                        step={100}
                        onChange={(e) => updateSamples(parseInt(e.target.value))}
                        disabled={isPlotting}
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="samplePeriod">Sample Period (ms):</label>
                    <input
                        type="number"
                        id="weight"
                        value={samplePeriod}
                        step={5}
                        onChange={(e) => updateSamplePeriod(parseFloat(e.target.value))}
                        disabled={isPlotting}
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="cutoffFrequency">Cutoff Frequency:</label>
                    <input
                        type="number"
                        id="cutoffFrequency"
                        value={cutoffFrequency}
                        step={0.1}
                        onChange={(e) => updateCutoffFrequency(parseFloat(e.target.value))}
                        disabled={isPlotting}
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="phidgetSamplePeriod">Phidget Sample Period:</label>
                    <input
                        type="number"
                        id="phidgetSamplePeriod"
                        value={phidgetSamplePeriod}
                        step={10}
                        onChange={(e) => updatePhidgetSamplePeriod(parseFloat(e.target.value))}
                        disabled={isPlotting}
                    />
                </div>
            </section>

            {isPlotting && (
                <div className="loading-bar-container">
                    <div className="loading-bar" style={{ width: `${progress}%` }}></div>
                </div>
            )}

            <section className="data-display">
                <div className="data-item">
                    <strong>Status:</strong> {currentStatus}
                </div>
                <div className="data-item">
                    <strong>Weight:</strong> {currentWeight-tare}
                </div>
            </section>

            <section className="plot-container">
                <h2>Calibration Data</h2>
                <div style={{ width: '100%', maxWidth: '600px', height: '350px' }}>
                    <Plot xValues={xPlotValues} yValues={yPlotValues} />
                </div>
            </section>

            <footer>
                <p>&copy; Caldo Restaurant Technologies</p>
            </footer>
        </main>
    );
}

export default App;