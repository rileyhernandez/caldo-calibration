
// import { useState, useEffect } from "react";
// import { invoke } from "@tauri-apps/api/core";
import "./App.css";
// import Plot from './plot';
import {BrowserRouter, Route, Routes} from "react-router";
import Connect from "./Connect.tsx";
import Read from "./Read.tsx";
import Calibrate from "./Calibrate.tsx"; // Import the chart component

function App() {

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Connect />} />
                <Route path="/read" element={<Read />} />
                <Route path="/calibrate" element={<Calibrate />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;