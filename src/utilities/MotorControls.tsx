import React from "react";
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

async function moveMotor(updateStatus: (status: string) => void) {
    updateStatus("Moving Motor...");
    try {
        await invoke("move_motor", {});
        updateStatus("Motor Command Sent");
    } catch (e: any) {
        updateStatus(String(e));
    }
}

interface MotorControlsProps {
    updateStatus: (status: string) => void;
    isDisabled?: boolean;
}
export const MotorControls: React.FC<MotorControlsProps> = ({ updateStatus, isDisabled }) => {
    return (
        <section className="controls">
            <div className="button-grid">
                <button onClick={() => enableMotor(updateStatus)}>Enable Motor</button>
                <button onClick={() => disableMotor(updateStatus)} disabled={isDisabled}>Disable Motor</button>
                <button onClick={() => moveMotor(updateStatus)} disabled={isDisabled}>Move</button>
            </div>
        </section>
    )
}