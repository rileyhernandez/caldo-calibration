import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
    // const [input, setInput] = useState("nope :(");
    const [currentStatus, updateStatus] = useState("");
    const [currentReading, updateReading] = useState("");
    const [samples, updateSamples] = useState(0);

    async function connectScale() {
        // try {
        //     const result: string = await invoke("connect_scale");
        //     updateReading(result);
        // } catch (error: any) {
        //     updateStatus(error);
        // }
        const result: string = await invoke("connect_scale");
        updateStatus(result);
    }
    async function checkRawReadings() {
        try {
            const result: string = await invoke("check_raw_readings", {});
            updateReading(result);
        } catch (error: any) {
            console.error("Error invoking command: ", error);
            console.error("Error details: ", error);
            updateStatus(error);
        }
    }
    async function weighScale(samples: number) {
        try {
            const result: string = await invoke("weigh_scale", {samples});
            updateStatus(result)
        } catch (error: any) {
            updateStatus(error)
        }
    }
    async function calibrateScale() {
        const result: string = await invoke("calibrate", {samples: 10});
        updateStatus(result);
    }
    async function addTrial(samples: number, weight: number) {
        try {
            const result: string = await invoke("add_trial", {samples, weight});
            updateStatus(result)
        } catch (error: any) {
            updateStatus(error)
        }
    }

    return (
        <main className="container">
            <h1>Welcome to Calibration</h1>

            <div className="row">
                <button
                    onClick={async (e) => {
                        e.preventDefault();
                        await connectScale();
                    }}
                >
                    Connect
                </button>
                <button
                    onClick={async (e) => {
                        e.preventDefault();
                        await checkRawReadings();
                    }}
                >
                    Read
                </button>
                <button
                    onClick={async (e) => {
                        e.preventDefault();
                        await addTrial(samples, 28.7);
                    }}
                >
                    Add Trial
                </button>
                <button
                    onClick={async (e) => {
                        e.preventDefault();
                        await weighScale(samples);
                    }}
                >
                    Weigh
                </button>
                <button
                    onClick={async (e) => {
                        e.preventDefault();
                        await calibrateScale();
                    }}
                >
                    Calibrate
                </button>
            </div>
            <div className="row">
                <input 
                    type="number" value={samples} step={1000}
                    onChange={(e) => {updateSamples(parseInt(e.target.value))}} 
                />
            </div>
            <p>Readings: {currentReading}</p>
            <p>Status: {currentStatus}</p>
            <p>Samples: {samples}</p>
        </main>
    );
}

export default App;