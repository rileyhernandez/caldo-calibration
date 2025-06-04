
// import { useState, useEffect } from "react";
// import { invoke } from "@tauri-apps/api/core";
import "./App.css";
// import Plot from './plot';
import {BrowserRouter, Route, Routes} from "react-router";
import Connect from "./Connect.tsx";
import Read from "./Read.tsx";
import Calibrate from "./Calibrate.tsx";
import LoadCell from "./LoadCell.tsx";
import Motor from "./Motor.tsx"; // Import the chart component

function App() {

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Connect />} />
                <Route path="/read" element={<Read />} />
                <Route path="/calibrate" element={<Calibrate />} />
                <Route path="/loadCell" element={<LoadCell />} />
                <Route path="/motor" element={<Motor />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;