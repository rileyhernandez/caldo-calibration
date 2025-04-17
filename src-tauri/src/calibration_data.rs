use std::time::{Duration, SystemTime, UNIX_EPOCH};
use http::header::CONTENT_TYPE;

#[derive(Debug, Clone, serde::Serialize)]
pub struct Trial {
    readings: Vec<f64>,
    weight: f64,
    timestamp: Duration
}
impl Trial {
    pub fn from_array(data: [f64; 4], weight: f64) -> Self {
        Self {
            readings: data.to_vec(),
            weight,
            timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap()
        }
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct CalibrationData {
    trials: Vec<Trial>,
    phidget_id: i32
}
impl CalibrationData {
    pub fn new(phidget_id: i32) -> Self {
        Self { trials: Vec::new(), phidget_id }
    }
    pub fn add_trial(&mut self, trial: Trial) {
        self.trials.push(trial);
    }
    pub fn get_trials(&self) -> Vec<Trial> {
        self.trials.clone()
    }
}