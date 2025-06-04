
import "./App.css";
import { useNavigate } from "react-router";
import {MotorControls} from "./utilities/MotorControls.tsx";
import {useState} from "react";

function App() {
    const [currentStatus, updateStatus] = useState("");
    const navigate = useNavigate();

    return (
        <main className={`app-container`}>
            <header>
                <h1>Motor Control Page</h1>
            </header>
            <MotorControls updateStatus={updateStatus} isDisabled={false} showStepsInput={true}/>
            <section className="data-display">
                <div className="data-item">
                    <strong>Status:</strong> {currentStatus}
                </div>
            </section>
            <section className="controls">
                <div className="button-grid">
                    <button onClick={() => navigate("/")}>Go Back</button>
                </div>
            </section>
        </main>
    );
}

export default App;