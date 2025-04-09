use libra::scale::{ConnectedScale, ScaleError};
use phidget::ReturnCode;
use std::{fmt::{self}, time::Duration};
use thiserror::Error;

#[derive(Error, Debug, Clone)]
pub enum AppError {
    #[error("No Scale Connected!")]
    NoScale,
    #[error("Scale Error")]
    Libra(ScaleError),
    #[error("Phidget Error")]
    Phidget(ReturnCode),
    #[error("Must Calibrate Scale to Use!")]
    NotCalibrated,
}
impl AppError {
    pub fn string(&self) -> String {
        format!("{:?}", self)
    }
}

#[derive(Debug, Clone)]
pub enum Message {
    ScaleConnected,
    ScaleCalibrated
}
impl Message {
    pub fn string(&self) -> String {
        format!("{:?}", self)
    }
}

pub struct AppData {
    scale: Option<ConnectedScale>,
    coefficients: Option<[f64; 4]>,
    state: State,
    calibration_data: CalibrationData
}
impl AppData {
    pub fn new() -> Self {
        Self {
            scale: None,
            coefficients: None,
            state: State::Idle,
            calibration_data: CalibrationData::new()
        }
    }

    pub fn get_state(&self) -> State {
        self.state.clone()
    }
    pub fn set_state(&mut self, state: State) {
        self.state = state;
    }
    pub fn set_state_from_ui(&mut self, state: &str) {
        self.set_state(
            match state {
                "Connect" => State::Connect,
                _ => State::Idle
            }
        )
        
    }
    fn has_connected_scale(&self) -> Result<(), AppError> {
        if let Some(_) = self.scale {
            Ok(())
        } else {
            Err(AppError::NoScale)
        }
    }
    fn is_calibrated(&self) -> Result<(), AppError> {
        if self.coefficients.is_none() {
            Err(AppError::NotCalibrated)
        } else {
            Ok(())
        }
    }

    pub fn connect_scale(&mut self) -> Result<(), AppError> {
        if self.has_connected_scale().is_ok() {
            println!("Already connected!");
            return Ok(())
        }

        self.scale
            .replace(
                ConnectedScale::without_id(Duration::from_secs(3))
                .map_err(AppError::Libra)?
            );
        Ok(())
    }
    pub fn weigh_scale(&self, samples: usize) -> Result<f64, AppError> {
        self.is_calibrated()?;
        self.scale.as_ref().ok_or(AppError::NoScale).map(|scale| {
            ConnectedScale::get_median_weight(scale, samples).map_err(AppError::Libra)
        })?
    }
    pub fn raw_scale_readings(&self) -> Result<Vec<f64>, AppError> {
        self.has_connected_scale()?;
        self.scale
            .as_ref()
            .map(|scale| 
                ConnectedScale::get_raw_readings(scale)
                    .map_err(AppError::Phidget)).unwrap()
    }
    pub fn get_raw_medians(&self, samples: usize) -> Result<[f64; 4], AppError> {
        self.scale.as_ref().ok_or(AppError::NoScale).map(|scale| {
            scale.get_raw_medians(samples).map_err(AppError::Libra)
        })?
    }
    pub fn get_calibration_data(&self) -> CalibrationData {
        self.calibration_data.clone()
    }
    pub fn add_trial(&mut self, trial: [f64; 4]) {
        self.calibration_data.add_trial(trial);
    }
    pub fn add_zero_trial(&mut self, trial: [f64; 4]) {
        self.calibration_data.add_zero_trial(trial);
    }
}
impl fmt::Display for AppData {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Scale: {}, Coefficients: {:?}, State: {:?}", self.scale.is_some(), self.coefficients, self.get_state())
    }
}

#[derive(Debug, Clone)]
pub enum State {
    Idle,
    Connect,
    Calibrate,
    Failure(AppError),
}

#[derive(Debug, Clone)]
pub struct CalibrationData {
    data: Vec<[f64; 4]>,
    zero_data: Option<[f64; 4]>,
}
impl CalibrationData {
    pub fn new() -> Self {
        Self { data: Vec::new(), zero_data: None }
    }
    pub fn add_trial(&mut self, trial: [f64; 4]) {
        self.data.push(trial);
    }
    pub fn add_zero_trial(&mut self, trial: [f64; 4]) {
        self.zero_data.replace(trial);
    }
    pub fn get_weight_trials(&self) -> Vec<[f64; 4]> {
        self.data.clone()
    }
    pub fn get_zero_trial(&self) -> Option<[f64; 4]> {
        self.zero_data
    }
    pub fn calibrate(&self) {
        /*
        let num_rows = vec.len();
    let num_cols = 4; // Each inner array has 4 elements

    let mut data = Vec::with_capacity(num_rows * num_cols);
    for row in vec {
        data.extend_from_slice(&row);
    }

    Mat::from_vec(num_rows, num_cols, data
     */
    let vec = &self.data;

    let num_rows = vec.len();
    let num_col = 4;

    let mut data = Vec::with_capacity(num_rows*num_col);
    vec.iter().for_each(|row| { data.extend_from_slice(row); });

    // faer::Mat::from_vec(vec)
    }
}