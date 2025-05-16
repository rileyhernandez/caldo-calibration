
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import Plot from './plot';
import {Simulate} from "react-dom/test-utils";
import error = Simulate.error; // Import the chart component

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

    const [samples, updateSamples] = useState(0);
    const [samplePeriod, updateSamplePeriod] = useState(0);
    const [cutoffFrequency, updateCutoffFrequency] = useState(0);

    const [xPlotValues, setXPlotValues] = useState<number[]>([1.0, 2.5, 3, 4]);
    const [yPlotValues, setYPlotValues] = useState<number[]>([0, 3.1, 4.3, 6.1]);

    function median(data: number[]): number {
        return data[Math.floor(data.length / 2)]
    }

    async function plotData(dataRequest: DataRequest) {
        updateStatus("Conducting trial...")
        try {
            const result: { readings: number[]; times: { secs: number; nanos: number }[]} = await invoke("plot", { dataRequest });
            setXPlotValues(result.times.map(obj => obj.secs + obj.nanos * 10**-9));
            setYPlotValues(result.readings);
            updateStatus("Data logged!");
            updateWeight(median(result.readings));
        } catch (error: any) {
            updateStatus(String(error));
        }
    }

    async function filterTrial() {
        // TODO: lol forgot to actually do this
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
    return (
        <main className={`app-container`}>
            <header>
                <h1>Read</h1>
                <p className="subtitle">Weigh scale and diagnose readings.</p>
            </header>

            <section className="controls">
                <div className="button-grid">
                    <button onClick={rawTrial}>Raw</button>
                    <button onClick={() => {}}>Median</button>
                    <button onClick={filterTrial}>Filtered</button>
                    <button onClick={checkAppData}>Check App Data</button>
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
                    />
                </div>
            </section>

            <section className="data-display">
                <div className="data-item">
                    <strong>Status:</strong> {currentStatus}
                </div>
                <div className="data-item">
                    <strong>Weight:</strong> {currentWeight}
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