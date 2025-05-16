use std::sync::Mutex;
use serde::Deserialize;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use crate::errors::AppError;
use crate::state::AppData;

#[derive(Debug, Clone, serde::Serialize)]
pub struct CalibrationTrial {
    readings: Vec<f64>,
    weight: f64,
    timestamp: Duration,
}
impl CalibrationTrial {
    pub fn from_array(data: [f64; 4], weight: f64) -> Self {
        Self {
            readings: data.to_vec(),
            weight,
            timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap(),
        }
    }
    pub fn new(state: tauri::State<'_, Mutex<AppData>>, samples: usize, weight: f64, sample_period: Duration) -> Result<Self, AppError> {
        if samples == 0 {
            return Err(AppError::ZeroSamples);
        }
        let mut scale = {
            let mut state = state.lock().unwrap();
            state.take_scale()?
        };
        // TODO: include sample rate!
        scale.set_data_intervals(sample_period).map_err(AppError::Libra)?;
        let readings = scale.get_load_cell_medians(samples, sample_period).map_err(AppError::Libra)?;
        {
            state.lock().unwrap().return_scale(scale)?;
        }
        Ok( Self::from_array(readings, weight))
    }
}
#[derive(Debug, Clone, serde::Serialize)]
pub struct CalibrationData {
    trials: Vec<CalibrationTrial>,
    phidget_id: i32,
}
impl CalibrationData {
    pub fn new(phidget_id: i32) -> Self {
        Self {
            trials: Vec::new(),
            phidget_id,
        }
    }
    pub fn add_trial(&mut self, trial: CalibrationTrial) {
        self.trials.push(trial);
    }
}

#[derive(Deserialize)]
pub struct Coefficients {
    coefficients: [f64; 4],
}
impl Coefficients {
    pub fn get_coefficients(&self) -> [f64; 4] {
        self.coefficients
    }
}
