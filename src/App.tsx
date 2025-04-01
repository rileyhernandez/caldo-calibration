import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
    // const [input, setInput] = useState("nope :(");
    const [con, setSn] = useState("noooo");

    // async function test() {
    //     try {
    //         const result: string = await invoke("my_custom_command", { invoke_message: input });
    //         setInput(result);
    //     } catch (error) {
    //         console.error("Error invoking command:", error);
    //         console.error("Error details:", error); // Log the entire error object
    //         setInput("Error occurred");
    //     }
    // }

    async function connect() {
        try {
            const result: string = await invoke("connect", {});
            setSn(result);
        } catch (error) {
            console.error("Error invoking command: ", error);
            console.error("Error details: ", error);
        }
    }

    return (
        <main className="container">
            <h1>Welcome to Calibration</h1>

            <div className="row">
                <button
                    onClick={async (e) => {
                        e.preventDefault();
                        setSn("loading...");
                        await connect();
                    }}
                >
                    Get Serial Number
                </button>
            </div>
            <p>{con}</p>
        </main>
    );
}

export default App;