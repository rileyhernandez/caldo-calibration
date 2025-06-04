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

interface MotorControlsProps {
    updateStatus: (status: string) => void;
    isDisabled?: boolean;
    showStepsInput?: boolean; // New prop to control visibility of steps input
}
export const MotorControls: React.FC<MotorControlsProps> = ({ updateStatus, isDisabled, showStepsInput = false }) => { // Default showStepsInput to false
    const [steps, setSteps] = useState<number>(1); // Default steps to 1

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
        </section>
    )
}