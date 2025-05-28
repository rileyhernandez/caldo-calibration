import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import Plot from './plot';
import {disableMotor, enableMotor, sleepForDenoise} from "./utils.ts";

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
    interface DispenseSettings {
        sample_period: Duration;
        cutoff_frequency: number;
        check_offset: number;
        weight: number;
        max_velocity: number;
        min_velocity: number;
        timeout: Duration;
    }

    /*
    pub struct DispenseSettings {
    sample_period: Duration,
    cutoff_frequency: f64,
    check_offset: f64,
    weight: f64,
    starting_velocity: f64,
}
     */

    const [currentStatus, updateStatus] = useState("");
    const [currentWeight, updateWeight] = useState(0);
    const [tare, updateTare] = useState(0);

    const [samples, updateSamples] = useState(200);
    const [samplePeriod, updateSamplePeriod] = useState(80);
    const [cutoffFrequency, updateCutoffFrequency] = useState(2);
    const [phidgetSamplePeriod, updatePhidgetSamplePeriod] = useState(40);
    const [dispenseWeight, setDispenseWeight] = useState(50); // New state for dispense weight
    const [maxVelocity, setMaxVelocity] = useState(0.5); // New state for starting velocity
    const [minVelocity, setMinVelocity] = useState(0.1);
    const [checkOffset, setCheckOffset] = useState(5);
    const [timeout, setTimeout] = useState(30);


    const [xPlotValues, setXPlotValues] = useState<number[]>([]);
    const [yPlotValues, setYPlotValues] = useState<number[]>([]);

    const [progress, setProgress] = useState(0);
    const [isPlotting, setIsPlotting] = useState(false);
    const progressInterval = useRef<number | null>(null);

    function median(data: number[]): number {
        // Consider adding a check for empty array to prevent errors
        if (data.length === 0) return 0;
        // For a more robust median, sort the array first
        const sortedData = [...data].sort((a, b) => a - b);
        return sortedData[Math.floor(sortedData.length / 2)];
    }

    async function setPhidgetInterval() {
        try {
            const result: string = await invoke("set_phidget_interval", {samplePeriod: {secs: 0, nanos: phidgetSamplePeriod*1000000}})
            updateStatus("Data Interval Set!");
            console.log(result);
        } catch (e: any) {
            updateStatus(String(e));
        }
    }

    async function plotData(dataRequest: DataRequest) {
        updateStatus("Conducting trial...");
        await sleepForDenoise();

        const totalTime = dataRequest.samples * (dataRequest.sample_period.secs + dataRequest.sample_period.nanos / 1_000_000_000) * 1000; // in milliseconds

        setIsPlotting(true);
        setProgress(0);

        const steps = 500;
        const increment = 100 / steps;
        const intervalDuration = totalTime / steps;

        return new Promise<{ readings: number[]; times: { secs: number; nanos: number }[] }>((resolve, reject) => {
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

            invoke("plot", { dataRequest })
                .then((result: unknown) => {
                    if (progressInterval.current !== null) {
                        window.clearInterval(progressInterval.current);
                    }
                    // Type guard for the result
                    if (typeof result === 'object' && result !== null && 'readings' in result && Array.isArray((result as any).readings) && 'times' in result && Array.isArray((result as any).times)) {
                        const typedResult = result as { readings: number[]; times: { secs: number; nanos: number }[] };
                        setXPlotValues(typedResult.times.map(obj => obj.secs + obj.nanos * 1e-9)); // Use 1e-9 for brevity
                        setYPlotValues(typedResult.readings);
                        updateStatus("Data logged!");
                        updateWeight(median(typedResult.readings));
                        resolve(typedResult);
                    } else {
                        updateStatus("Unexpected data format received!");
                        reject("Unexpected data format");
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
                });
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

    // Placeholder for dispense functionality
    async function handleDispense() {
        let dataRequest: DataRequest = {
            trial: "Raw",
            samples: samples,
            sample_period: {secs: 0, nanos: samplePeriod*1000000},
            cutoff_frequency: cutoffFrequency
        }
        let dispenseSettings: DispenseSettings = {
            sample_period: {secs: 0, nanos: samplePeriod*1000000},
            cutoff_frequency: cutoffFrequency,
            check_offset: checkOffset,
            weight: dispenseWeight,
            max_velocity: maxVelocity,
            min_velocity: minVelocity,
            timeout: {secs: timeout, nanos: 0}
        }
        await dispense(dataRequest, dispenseSettings);
    }
    async function dispense(dataRequest: DataRequest, dispenseSettings: DispenseSettings) {
        updateStatus("Conducting trial...");
        await sleepForDenoise();

        const totalTime = dataRequest.samples * (dataRequest.sample_period.secs + dataRequest.sample_period.nanos / 1_000_000_000) * 1000; // in milliseconds

        setIsPlotting(true);
        setProgress(0);

        const steps = 500;
        const increment = 100 / steps;
        const intervalDuration = totalTime / steps;

        return new Promise<{ readings: number[]; times: { secs: number; nanos: number }[] }>((resolve, reject) => {
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

            invoke("dispense", { dataRequest, dispenseSettings })
                .then((result: unknown) => {
                    if (progressInterval.current !== null) {
                        window.clearInterval(progressInterval.current);
                    }
                    // Type guard for the result
                    if (typeof result === 'object' && result !== null && 'readings' in result && Array.isArray((result as any).readings) && 'times' in result && Array.isArray((result as any).times)) {
                        const typedResult = result as { readings: number[]; times: { secs: number; nanos: number }[] };
                        setXPlotValues(typedResult.times.map(obj => obj.secs + obj.nanos * 1e-9)); // Use 1e-9 for brevity
                        setYPlotValues(typedResult.readings);
                        updateStatus("Data logged!");
                        updateWeight(median(typedResult.readings));
                        resolve(typedResult);
                    } else {
                        updateStatus("Unexpected data format received!");
                        reject("Unexpected data format");
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
                });
        });
    }
    async function moveMotor() {
        updateStatus("Moving Motor...");
        try {
            await invoke("move_motor", {});
            updateStatus("Motor Command Sent");
        } catch (e: any) {
            updateStatus(String(e));
        }
    }

    useEffect(() => {
        return () => {
            if (progressInterval.current !== null) {
                window.clearInterval(progressInterval.current);
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
                    <button onClick={async () => {await enableMotor(updateStatus)}} disabled={isPlotting}>Enable Motor</button>
                    <button onClick={async () => { await disableMotor(updateStatus) }} disabled={isPlotting}>Disable Motor</button>
                    <button onClick={moveMotor}>Move Motor</button>
                </div>
            </section>

            <section className="controls">
                <div className="button-grid">
                    <button onClick={rawTrial} disabled={isPlotting}>Raw</button>
                    <button onClick={() => { /* Implement Median Trial if needed */ }} disabled={isPlotting}>Median</button>
                    <button onClick={filterTrial} disabled={isPlotting}>Filtered</button>
                </div>
            </section>
            <section className="controls">
                <div className="button-grid">
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
                        min={1} // Added min value
                        onChange={(e) => updateSamples(parseInt(e.target.value, 10))}
                        disabled={isPlotting}
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="samplePeriod">Sample Period (ms):</label>
                    <input
                        type="number"
                        id="samplePeriod" // Corrected id from "weight" to "samplePeriod"
                        value={samplePeriod}
                        step={5}
                        min={1} // Added min value
                        onChange={(e) => updateSamplePeriod(parseFloat(e.target.value))}
                        disabled={isPlotting}
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="cutoffFrequency">Cutoff Frequency (Hz):</label>
                    <input
                        type="number"
                        id="cutoffFrequency"
                        value={cutoffFrequency}
                        step={0.1}
                        min={0.1} // Added min value
                        onChange={(e) => updateCutoffFrequency(parseFloat(e.target.value))}
                        disabled={isPlotting}
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="phidgetSamplePeriod">Phidget Sample Period (ms):</label>
                    <input
                        type="number"
                        id="phidgetSamplePeriod"
                        value={phidgetSamplePeriod}
                        step={10}
                        min={8} // Phidgets often have a minimum interval
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
                    <strong>Weight:</strong> {(currentWeight-tare).toFixed(2)}g {/* Added toFixed for better display */}
                </div>
            </section>

            <section className="plot-container">
                <h2>Calibration Data</h2>
                <div style={{ width: '100%', maxWidth: '600px', height: '350px' }}>
                    <Plot xValues={xPlotValues} yValues={yPlotValues} />
                </div>
            </section>

            <section className="controls">
                <div className="button-grid">
                    <button onClick={checkAppData} disabled={isPlotting}>Check App Data</button>
                </div>
                {/* New Dispense Section */}
                <div className="input-group" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label htmlFor="dispenseWeight">Dispense Weight (g):</label>
                    <input
                        type="number"
                        id="dispenseWeight"
                        value={dispenseWeight}
                        step={10}
                        min={0}
                        onChange={(e) => setDispenseWeight(parseFloat(e.target.value))}
                        disabled={isPlotting}
                        style={{ width: '100px' }}
                    />
                    <label htmlFor="maxVelocity">Max Velocity:</label>
                    <input
                        type="number"
                        id="maxVelocity"
                        value={maxVelocity}
                        step={0.1}
                        min={0.1}
                        onChange={(e) => setMaxVelocity(parseFloat(e.target.value))}
                        disabled={isPlotting}
                        style={{ width: '100px' }}
                    />
                    <label htmlFor="minVelocity">Min Velocity:</label>
                    <input
                        type="number"
                        id="minVelocity"
                        value={minVelocity}
                        step={0.1}
                        min={0.1}
                        onChange={(e) => setMinVelocity(parseFloat(e.target.value))}
                        disabled={isPlotting}
                        style={{ width: '100px' }}
                    />
                    <label htmlFor="checkOffset">Check Offset:</label>
                    <input
                        type="number"
                        id="checkOffset"
                        value={checkOffset}
                        step={1}
                        min={0}
                        onChange={(e) => setCheckOffset(parseFloat(e.target.value))}
                        disabled={isPlotting}
                        style={{ width: '100px' }}
                    />
                    <label htmlFor="timeout">Timeout:</label>
                    <input
                        type="number"
                        id="timeout"
                        value={timeout}
                        step={10}
                        min={0}
                        onChange={(e) => setTimeout(parseInt(e.target.value))}
                        disabled={isPlotting}
                        style={{ width: '100px' }}
                    />
                    <button onClick={handleDispense} disabled={isPlotting}>Dispense</button>
                </div>
            </section>

            <footer>
                <p>&copy; Caldo Restaurant Technologies</p>
            </footer>
        </main>
    );
}

export default App;