import React, { useState } from "react";
import {invoke} from "@tauri-apps/api/core";

async function enableMotor(updateStatus: (status: string) => void) {
    updateStatus("Enabling motor...");
    try {
        await invoke("enable_motor", {});
        updateStatus("Motor enabled!");
    } catch (error: any) {
        updateStatus(String(error));
    }
}

async function disableMotor(updateStatus: (status: string) => void) {
    updateStatus("Disabling motor...");
    try {
        await invoke("disable_motor", {});
        updateStatus("Motor disabled!");
    } catch (error: any) {
        updateStatus(String(error));
    }
}

async function moveMotor(updateStatus: (status: string) => void, steps: number) {
    updateStatus("Moving Motor...");
    try {
        await invoke("move_motor", { steps });
        updateStatus("Motor Command Sent");
    } catch (e: any) {
        updateStatus(String(e));
    }
}
async function setVelo(updateStatus: (status: string) => void, velo: number) {
    updateStatus("Setting Motor Velo...");
    try {
        await invoke("set_velo", { velo });
        updateStatus("Motor Velo Set!");
    } catch (e: any) {
        updateStatus(String(e));
    }
}
async function mockDispense(updateStatus: (status: string) => void, steps: number, velo: number, retract: number) {
    updateStatus("Running Mock Dispense...");
    try {
        await setVelo(updateStatus, velo);
        await invoke("mock_dispense", { steps, retract });
        updateStatus("Dispense Complete!");
    } catch (e: any) {
        updateStatus(String(e));
    }
}

interface MotorControlsProps {
    updateStatus: (status: string) => void;
    isDisabled?: boolean;
    showStepsInput?: boolean; // New prop to control visibility of steps input
    showMockDispense?: boolean; // New prop to control visibility of mock dispense button
}
export const MotorControls: React.FC<MotorControlsProps> = ({ updateStatus, isDisabled, showStepsInput = false, showMockDispense = false }) => { // Default showStepsInput to false
    const [steps, setSteps] = useState<number>(10);
    const [velo, setVelo] = useState<number>(0.3);
    const [retract, setRetract] = useState<number>(1);

    return (
        <section className="controls">
            <div className="button-grid">
                <button onClick={() => enableMotor(updateStatus)} disabled={isDisabled}>Enable Motor</button>
                <button onClick={() => disableMotor(updateStatus)} disabled={isDisabled}>Disable Motor</button>
                <button onClick={() => moveMotor(updateStatus, steps)} disabled={isDisabled}>Move</button>
            </div>
            {/* Conditionally render the input for steps */}
            {showStepsInput && (
                <div className="input-group" style={{ marginTop: '10px' }}>
                    <label htmlFor="motorSteps">Steps:</label>
                    <input
                        type="number"
                        id="motorSteps"
                        value={steps}
                        min={1}
                        onChange={(e) => setSteps(parseFloat(e.target.value))}
                        disabled={isDisabled}
                    />
                </div>
            )}
            {showMockDispense && (
                <div>
                    <div className="input-group">
                        <label htmlFor="motorVelo">Velo:</label>
                        <input
                            type="number" id="motorVelo"
                            value={velo} min={0.1}
                            onChange={(e) => {setVelo(parseFloat(e.target.value))}}
                        />
                        <label htmlFor="motorSteps">Steps:</label>
                        <input
                            type="number" id="motorSteps"
                            value={steps} min={0}
                            onChange={(e) => {setSteps(parseFloat(e.target.value))}}
                        />
                        <label htmlFor="motorRetract">Retract Steps:</label>
                        <input
                            type="number" id="motorRetract"
                            value={retract} min={0}
                            onChange={(e) => {setRetract(parseFloat(e.target.value))}}
                        />
                    </div>
                    <div className="button-grid">
                        <button onClick={() => mockDispense(updateStatus, steps, velo, retract)} disabled={isDisabled}>
                            Mock Dispense
                        </button>
                    </div>
                </div>
            )}
        </section>
    )
}