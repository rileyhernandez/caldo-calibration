
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import {useNavigate} from "react-router";

function App() {
    const [currentStatus, updateStatus] = useState("");
    const [samples, updateSamples] = useState(100);
    const [samplePeriod, updateSamplePeriod] = useState(100);
    const [weight, updateWeight] = useState(0);

    const navigate = useNavigate();

    async function calibrateScale() {
        updateStatus("Calibrating...");
        const result: string = await invoke("calibrate", {});
        updateStatus(result);
        navigate("/read");
    }
    async function addTrial(samples: number, weight: number) {
        updateStatus("Collecting data...");
        try {
            const result: string = await invoke("add_trial", { samples, weight, samplePeriod: { secs: 0, nanos: samplePeriod*1000000} });
            updateStatus(result);
        } catch (error: any) {
            updateStatus(String(error));
        }
    }
    async function enableMotor() {
        try {
            await invoke("enable_motor", {});
            updateStatus("Motor enabled!");
        } catch (error: any) {
            updateStatus(String(error));
        }
    }
    async function disableMotor() {
        try {
            await invoke("disable_motor", {});
            updateStatus("Motor disabled!");
        } catch (error: any) {
            updateStatus(String(error));
        }
    }

    return (
        <main className={`app-container`}>
            <header>
                <h1>Calibrate</h1>
                <p className="subtitle">Calibrate scale</p>
            </header>

            <section className="controls">
                <div className="button-grid">
                    <button onClick={enableMotor}>Enable Motor</button>
                    <button onClick={disableMotor}>Disable Motor</button>
                </div>
            </section>
            <section className="controls">
                <div className="button-grid">
                    <button onClick={() => addTrial(samples, weight)}>Add Trial</button>
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
                    />
                </div>
            </section>

            <section className="data-display">
                <div className="data-item">
                    <strong>Status:</strong> {currentStatus}
                </div>
                <div className="data-item">
                    <strong>Current Samples:</strong> {samples}
                </div>
            </section>

            <section className="controls">
                <div className="button-grid">
                    <button onClick={calibrateScale}>Calibrate</button>
                </div>
            </section>
        </main>
    );
}

export default App;