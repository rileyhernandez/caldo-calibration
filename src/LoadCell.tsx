import { useState, useRef, useEffect } from "react"; // Added useRef and useEffect
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { useNavigate } from "react-router";
import { sleepForDenoise } from "./utilities/utils.ts";
import {MotorControls} from "./utilities/MotorControls.tsx";
import Plot from "./plot.tsx";

function App() {
    const [currentStatus, updateStatus] = useState("");
    const [samples, updateSamples] = useState(100);
    const [samplePeriod, updateSamplePeriod] = useState(100); // Assuming this is in milliseconds
    const [weight, updateWeight] = useState(0);

    // State and ref for the addTrial loading bar
    const [isAddingTrial, setIsAddingTrial] = useState(false);
    const [trialProgress, setTrialProgress] = useState(0);
    const trialProgressInterval = useRef<number | null>(null);

    const navigate = useNavigate();



    async function calibrateScale() {
        updateStatus("Calibrating...");
        try {
            const result: string = await invoke("calibrate", {});
            updateStatus(result);
            navigate("/");
        } catch (error: any) {
            updateStatus(String(error));
        }
    }

    async function addTrial(currentSamples: number, currentWeight: number) {
        updateStatus("Collecting data...");
        await sleepForDenoise();

        const totalTime = currentSamples * samplePeriod;


        setIsAddingTrial(true);
        setTrialProgress(0);

        const steps = 200; // Number of steps for the progress bar animation
        const increment = 100 / steps;
        const intervalDuration = totalTime > 0 ? totalTime / steps : 50; // Avoid division by zero, ensure minimum interval

        // Clear any existing interval
        if (trialProgressInterval.current) {
            window.clearInterval(trialProgressInterval.current);
        }

        trialProgressInterval.current = window.setInterval(() => {
            setTrialProgress(prevProgress => {
                const newProgress = prevProgress + increment;
                if (newProgress >= 100) {
                    if (trialProgressInterval.current) {
                        window.clearInterval(trialProgressInterval.current);
                    }
                    return 100;
                }
                return newProgress;
            });
        }, intervalDuration);

        try {
            const result: string = await invoke("add_trial", {
                samples: currentSamples,
                weight: currentWeight,
                samplePeriod: { secs: 0, nanos: samplePeriod * 1000000 }
            });
            updateStatus(result);
        } catch (error: any) {
            updateStatus(String(error));
        } finally {
            if (trialProgressInterval.current) {
                window.clearInterval(trialProgressInterval.current);
            }
            setTrialProgress(100); // Ensure progress hits 100
            setIsAddingTrial(false);
            // Optionally reset progress to 0 after a short delay or immediately
            // setTimeout(() => setTrialProgress(0), 500);
        }
    }

    // Cleanup interval on component unmount
    useEffect(() => {
        return () => {
            if (trialProgressInterval.current) {
                window.clearInterval(trialProgressInterval.current);
            }
        };
    }, []);

    return (
        <main className={`app-container`}>
            <header>
                <h1>Raw Load Cell Readings</h1>
                {/*<p className="subtitle">Calibrate scale</p>*/}
            </header>

            {/* Loading bar specifically for addTrial */}
            {isAddingTrial && (
                <div className="loading-bar-container">
                    <div className="loading-bar" style={{ width: `${trialProgress}%` }}></div>
                </div>
            )}

            <MotorControls updateStatus={updateStatus} isDisabled={false}/>

            <section className="controls">
                <div className="button-grid">
                    <button onClick={() => addTrial(samples, weight)} disabled={isAddingTrial}>Add Trial</button>
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
                        disabled={isAddingTrial}
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
                        disabled={isAddingTrial}
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="weight">Weight:</label>
                    <input
                        type="number"
                        id="weight"
                        value={weight}
                        step={0.1}
                        onChange={(e) => updateWeight(parseFloat(e.target.value))}
                        disabled={isAddingTrial}
                    />
                </div>
            </section>

            <section className="data-display">
                <div className="data-item">
                    <strong>Status:</strong> {currentStatus}
                </div>
            </section>

            <section className="plot-container">
                <h2>Calibration Data</h2>
                <div style={{ width: '100%', maxWidth: '600px', height: '350px' }}>
                    {/*<Plot xValues={xPlotValues} yValues={yPlotValues} />*/}
                </div>
            </section>

            <section className="controls">
                <div className="button-grid">
                    <button onClick={calibrateScale} disabled={isAddingTrial}>Finish Calibration</button>
                </div>
            </section>
        </main>
    );
}

export default App;