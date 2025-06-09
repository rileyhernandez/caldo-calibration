import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import Plot, { LineData } from './plot'; // Import LineData
import {dropScale, Duration, durationFromMillis, sleepForDenoise} from "./utilities/utils.ts";
import {useNavigate} from "react-router";
import {MotorControls} from "./utilities/MotorControls.tsx";

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
    interface DispenseSettings {
        sample_period: Duration;
        cutoff_frequency: number;
        check_offset: number;
        weight: number;
        max_velocity: number;
        min_velocity: number;
        retract: number;
        timeout: Duration;
        start_buffer: Duration;
        check_samples: number;
    }

    const [currentStatus, updateStatus] = useState("");
    const [currentWeight, updateWeight] = useState(0);
    const [tare, updateTare] = useState(0);

    const [samples, updateSamples] = useState(200);
    const [samplePeriod, updateSamplePeriod] = useState(80);
    const [cutoffFrequency, updateCutoffFrequency] = useState(2);
    const [phidgetSamplePeriod, updatePhidgetSamplePeriod] = useState(40);
    const [dispenseWeight, setDispenseWeight] = useState(50);
    const [maxVelocity, setMaxVelocity] = useState(0.3);
    const [minVelocity, setMinVelocity] = useState(0.1);
    const [checkOffset, setCheckOffset] = useState(5);
    const [timeout, setTimeout] = useState(30);
    const [startBuffer, setStartBuffer] = useState(500);
    const [retract, setRetract] = useState(0.1);

    // Changed from xPlotValues and yPlotValues to plotDataSets
    const [plotDataSets, setPlotDataSets] = useState<LineData[]>([]);

    const [progress, setProgress] = useState(0);
    const [isPlotting, setIsPlotting] = useState(false);
    const progressInterval = useRef<number | null>(null);

    const navigate = useNavigate();

    function median(data: number[]): number {
        if (data.length === 0) return 0;
        const sortedData = [...data].sort((a, b) => a - b);
        return sortedData[Math.floor(sortedData.length / 2)];
    }

    async function setPhidgetInterval() {
        try {
            const result: string = await invoke("set_phidget_interval", {samplePeriod: durationFromMillis(phidgetSamplePeriod)})
            updateStatus("Data Interval Set!");
            console.log(result);
        } catch (e: any) {
            updateStatus(String(e));
        }
    }

    async function plotData(dataRequest: DataRequest) {
        updateStatus("Conducting trial...");
        await sleepForDenoise();

        const totalTime = dataRequest.samples * (dataRequest.sample_period.secs + dataRequest.sample_period.nanos / 1_000_000_000) * 1000;

        setIsPlotting(true);
        setProgress(0);

        const steps = 500;
        const increment = 100 / steps;
        const intervalDuration = totalTime > 0 ? totalTime / steps : 50; // Prevent division by zero

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
                    if (typeof result === 'object' && result !== null && 'readings' in result && Array.isArray((result as any).readings) && 'times' in result && Array.isArray((result as any).times)) {
                        const typedResult = result as { readings: number[]; times: { secs: number; nanos: number }[] };

                        // Update to set plotDataSets
                        const newXValues = typedResult.times.map(obj => obj.secs + obj.nanos * 1e-9);
                        const newYValues = typedResult.readings;
                        const newLine: LineData = {
                            xValues: newXValues,
                            yValues: newYValues,
                            label: `${dataRequest.trial} Data`,
                            borderColor: "#0000FF"
                        };
                        setPlotDataSets([newLine]); // Replace current plot with the new line

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
                    setProgress(100); // Ensure progress bar completes
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

    async function handleDispense() {
        let dataRequest: DataRequest = {
            trial: "Raw", // Dispense usually uses raw data for plotting its attempt
            samples: samples, // Or a specific number of samples for dispense monitoring
            sample_period: {secs: 0, nanos: samplePeriod*1000000},
            cutoff_frequency: null // Typically no filter during dispense plot
        }
        let dispenseSettings: DispenseSettings = {
            sample_period: {secs: 0, nanos: samplePeriod*1000000},
            cutoff_frequency: cutoffFrequency, // This might be for the control algorithm, not the plot
            check_offset: checkOffset,
            weight: dispenseWeight,
            max_velocity: maxVelocity,
            min_velocity: minVelocity,
            retract,
            timeout: {secs: timeout, nanos: 0},
            start_buffer: durationFromMillis(startBuffer),
            check_samples: 50,
        }
        await dispense(dataRequest, dispenseSettings);
    }

    async function dispense(dataRequest: DataRequest, dispenseSettings: DispenseSettings) {
        updateStatus("Dispensing...");
        await sleepForDenoise();

        const totalTime = dispenseSettings.timeout.secs * 1000; // Use dispense timeout for progress
        setIsPlotting(true); // isPlotting can be reused or renamed to isBusy/isDispensing
        setProgress(0);

        const steps = 500;
        const increment = 100 / steps;
        const intervalDuration = totalTime > 0 ? totalTime / steps : 50; // Prevent division by zero

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
                    if (typeof result === 'object' && result !== null && 'readings' in result && Array.isArray((result as any).readings) && 'times' in result && Array.isArray((result as any).times)) {
                        const typedResult = result as { readings: number[]; times: { secs: number; nanos: number }[] };

                        // Update to set plotDataSets
                        const newXValues = typedResult.times.map(obj => obj.secs + obj.nanos * 1e-9);
                        const newYValues = typedResult.readings;
                        const newLine: LineData = {
                            xValues: newXValues,
                            yValues: newYValues,
                            label: "Dispense Attempt" // Example label for dispense
                        };
                        console.log(newLine);
                        setPlotDataSets([newLine]); // Replace current plot with the new line

                        updateStatus("Dispense cycle finished!");
                        updateWeight(median(typedResult.readings)); // Update weight with final reading
                        resolve(typedResult);
                    } else {
                        updateStatus("Unexpected data format from dispense!");
                        reject("Unexpected data format from dispense");
                    }
                })
                .catch(error => {
                    if (progressInterval.current !== null) {
                        window.clearInterval(progressInterval.current);
                    }
                    updateStatus(`Dispense error: ${String(error)}`);
                    reject(error);
                })
                .finally(() => {
                    setIsPlotting(false);
                    setProgress(100); // Ensure progress bar completes
                });
        });
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

            <MotorControls updateStatus={updateStatus} isDisabled={isPlotting} showStepsInput={true}/>

            <section className="controls">
                <div className="button-grid">
                    <button onClick={rawTrial} disabled={isPlotting}>Raw</button>
                    <button onClick={() => {
                        // Example: Clear plot or implement specific median trial logic
                        setPlotDataSets([]); // Clears the plot
                        updateStatus("Median trial not fully implemented for plotting yet.");
                    }} disabled={isPlotting}>Median</button>
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
                        min={1}
                        onChange={(e) => updateSamples(parseInt(e.target.value, 10))}
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
                        min={1}
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
                        min={0.1}
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
                        min={8}
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
                    <strong>Weight:</strong> {(currentWeight-tare).toFixed(2)}g
                </div>
            </section>

            <section className="plot-container">
                <h2>Readings Data</h2> {/* Changed title for clarity */}
                <div style={{ width: '100%', maxWidth: '600px', height: '450px' }}>
                    {/* Updated Plot component usage */}
                    <Plot dataSets={plotDataSets} yAxisUnits="Weight (g)" />
                </div>
            </section>

            <section className="controls">
                <div className="button-grid">
                    <button onClick={checkAppData} disabled={isPlotting}>Check App Data</button>
                    <button
                        onClick={() => {
                            dropScale(updateStatus).then(()=> {
                                navigate("/")
                            })}
                        }
                        disabled={isPlotting} // Disable while plotting/dispensing
                    >Drop Scale</button>
                </div>
                <div className="input-group" >
                    <label htmlFor="dispenseWeight">Dispense (g):</label>
                    <input
                        type="number"
                        id="dispenseWeight"
                        value={dispenseWeight}
                        step={10}
                        min={0}
                        onChange={(e) => setDispenseWeight(parseFloat(e.target.value))}
                        disabled={isPlotting}
                        // style={{ width: '80px' }}
                    />
                    <label htmlFor="maxVelocity">Max Vel:</label>
                    <input
                        type="number"
                        id="maxVelocity"
                        value={maxVelocity}
                        step={0.1}
                        min={0.1}
                        onChange={(e) => setMaxVelocity(parseFloat(e.target.value))}
                        disabled={isPlotting}
                        // style={{ width: '70px' }}
                    />
                    <label htmlFor="minVelocity">Min Vel:</label>
                    <input
                        type="number"
                        id="minVelocity"
                        value={minVelocity}
                        step={0.1}
                        min={0.1}
                        onChange={(e) => setMinVelocity(parseFloat(e.target.value))}
                        disabled={isPlotting}
                        // style={{ width: '70px' }}
                    />
                    <label htmlFor="checkOffset">Offset:</label>
                    <input
                        type="number"
                        id="checkOffset"
                        value={checkOffset}
                        step={1}
                        min={0}
                        onChange={(e) => setCheckOffset(parseFloat(e.target.value))}
                        disabled={isPlotting}
                        // style={{ width: '70px' }}
                    />
                    <label htmlFor="retract">Retract:</label>
                    <input
                        type="number"
                        id="retract"
                        value={retract}
                        step={0.3}
                        min={0}
                        onChange={(e) => setRetract(parseFloat(e.target.value))}
                        disabled={isPlotting}
                        // style={{ width: '70px' }}
                    />
                    <label htmlFor="timeout">Timeout(s):</label>
                    <input
                        type="number"
                        id="timeout"
                        value={timeout}
                        step={10}
                        min={0}
                        onChange={(e) => setTimeout(parseInt(e.target.value))}
                        disabled={isPlotting}
                        // style={{ width: '70px' }}
                    />
                    <label htmlFor="startBuffer">Start Buffer (ms):</label>
                    <input
                        type="number"
                        id="startBuffer"
                        value={startBuffer}
                        step={100}
                        min={0}
                        onChange={(e) => setStartBuffer(parseInt(e.target.value))}
                        disabled={isPlotting}
                        // style={{ width: '70px' }}
                    />
                </div>
            </section>
            <section className="controls">
                <div className="button-grid">
                    <button onClick={handleDispense} disabled={isPlotting} >Dispense</button>
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

            <footer>
                <p>&copy; Caldo Restaurant Technologies</p>
            </footer>
        </main>
    );
}

export default App;