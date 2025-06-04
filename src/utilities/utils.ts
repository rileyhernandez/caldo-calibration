import {invoke} from "@tauri-apps/api/core";

export async function sleepForDenoise() {
    await new Promise((resolve) => setTimeout(resolve, 2000));
}

export async function dropScale(updateStatus: (status: string) => void) {
    updateStatus("Dropping scale...");
    try {
        await invoke("drop_scale");
        updateStatus("Scale dropped!");
    } catch (error: any) {
        updateStatus(String(error));

    }
}