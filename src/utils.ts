import {invoke} from "@tauri-apps/api/core";

export async function sleepForDenoise() {
    await new Promise((resolve) => setTimeout(resolve, 2000));
}

export async function enableMotor(updateStatus: (status: string) => void) {
    updateStatus("Enabling motor...");
    try {
        await invoke("enable_motor", {});
        updateStatus("Motor enabled!");
    } catch (error: any) {
        updateStatus(String(error));
    }
}

export async function disableMotor(updateStatus: (status: string) => void) {
    updateStatus("Disabling motor...");
    try {
        await invoke("disable_motor", {});
        updateStatus("Motor disabled!");
    } catch (error: any) {
        updateStatus(String(error));
    }
}