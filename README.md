# Caldo Calibration & Commissioning App

A high-precision calibration, commissioning, and health diagnostics tool for the Caldo robotic dispensing system. This application enables fine-tuning of dispensing parameters for various ingredient types, ensuring accurate portion control in high-vibration commercial kitchen environments.

## Overview

The Caldo system is a robotic dispenser designed for precision in demanding kitchen environments. This application serves as the primary interface for technicians and engineers to:
- **Commission** new hardware units.
- **Calibrate** load cells and motors for specific ingredients (speed, precision, dispense amounts).
- **Diagnose** system health and sensor telemetry.
- **Sync** local configurations with cloud-based setpoints and filter parameters.

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Desktop Framework:** [Tauri](https://tauri.app/) (Rust-based backend)
- **Backend Logic:** Rust (Handles serial communication, data processing, and hardware abstraction)
- **Styling:** CSS (Modular)

## Key Features

- **Ingredient Profiles:** Tune dispensing logic based on ingredient density, flow characteristics, and vibration compensation.
- **Motor & Load Cell Control:** Real-time monitoring and adjustment of hardware setpoints.
- **Local-to-Cloud Sync:** Edit filter parameters and calibration offsets locally and synchronize changes with the central cloud configuration.
- **Health Diagnostics:** Real-time plotting and telemetry for troubleshooting high-vibration interference and mechanical wear.

## Project Structure

- `src/`: React frontend components and UI logic.
  - `src/utilities/`: Hardware control abstractions and utility functions.
- `src-tauri/`: Rust backend implementation.
  - `src-tauri/src/calibrate.rs`: Core calibration algorithms.
  - `src-tauri/src/dispenser.rs`: Hardware interaction logic.
  - `src-tauri/src/state.rs`: Application state management.

## Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Node.js](https://nodejs.org/) (v18+)
- [Tauri Dependencies](https://tauri.app/v1/guides/getting-started/prerequisites)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd caldo-calibration
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the application in development mode:
   ```bash
   npm run tauri dev
   ```

## Development

- **Build for Production:** `npm run tauri build`
- **Linting:** `npm run lint`
