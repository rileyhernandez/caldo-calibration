
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import {useNavigate} from "react-router";
function App() {
    const [currentStatus, updateStatus] = useState("");
    const navigate = useNavigate();

    async function connectScale() {
        try {
            updateStatus("Connecting scale...");
            const result: string = await invoke("connect_scale");
            updateStatus(result);
        } catch (error: any) {
            console.error("Error invoking command: ", error);
            console.error("Error details: ", error);
            updateStatus(String(error));
        }
    }
    async function calibrateScale() {
        try {
            await connectScale();
            navigate("/calibrate");
        } catch (error: any) {
            updateStatus(String(error));
        }
    }
    async function getCoefficients() {
        try {
            await connectScale();
            updateStatus("Getting coefficients...");
            const result: string = await invoke("get_coefficients", {});
            updateStatus(result);
            navigate("/read")
        } catch (error: any) {
            updateStatus(String(error));
        }
    }
    async function setupRawLoadCells() {
        try {
            updateStatus("Connecting scale...");
            await connectScale();
            updateStatus("Connected!");
            let result: string = await invoke("setup_raw_data_collection")
            updateStatus(String(result))
            navigate("/loadCell")
        } catch (error: any) {
            updateStatus(String(error))
        }
    }
    return (
    <main className={`app-container`}>
        <header>
            <h1>Connect</h1>
            <p className="subtitle">Calibrate nodes and diagnose readings.</p>
        </header>

        <section className="controls">
            <div className="button-grid">
                <button onClick={calibrateScale}>Calibrate</button>
                <button onClick={getCoefficients}>Use Existing Calibration</button>
                <button onClick={setupRawLoadCells}>Read Load Cells</button>
            </div>
        </section>
        <section className="data-display">
            <div className="data-item">
                <strong>Status:</strong> {currentStatus}
            </div>
        </section>

        <footer>
            <p>&copy; Caldo Restaurant Technologies</p>
        </footer>
    </main>
);
}

export default App;