use std::fmt;
use std::time::Duration;

use crate::calibration_data::{CalibrationData, Coefficients, Trial};
use crate::errors::AppError;
use http::header::CONTENT_TYPE;
use libra::scale::ConnectedScale;

#[derive(Debug, Clone)]
pub enum Message {
    ScaleConnected,
    ScaleCalibrated,
}
impl Message {
    pub fn string(&self) -> String {
        format!("{:?}", self)
    }
}

pub struct AppData {
    scale: Option<ConnectedScale>,
    coefficients: Option<[f64; 4]>,
    calibration_data: Option<CalibrationData>,
}
impl AppData {
    pub fn new() -> Self {
        Self {
            scale: None,
            coefficients: None,
            calibration_data: None,
        }
    }
    fn has_connected_scale(&self) -> Result<(), AppError> {
        if self.scale.is_some() {
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
            return Ok(());
        }
        let scale = ConnectedScale::without_id(Duration::from_secs(3)).map_err(AppError::Libra)?;
        self.calibration_data
            .replace(CalibrationData::new(scale.get_phidget_id()));
        self.scale.replace(scale);
        Ok(())
    }
    pub fn update_coefficients(&mut self, coefficients: Coefficients) -> Result<(), AppError> {
        let scale = self
            .scale
            .take()
            .ok_or(AppError::NoScale)?
            .update_coefficients(coefficients.get_coefficients());
        self.scale.replace(scale);
        self.coefficients.replace(coefficients.get_coefficients());

        Ok(())
    }
    pub fn weigh_scale(&self, samples: usize) -> Result<f64, AppError> {
        self.is_calibrated()?;
        if samples == 0 {
            return Err(AppError::ZeroSamples);
        }
        self.scale.as_ref().ok_or(AppError::NoScale).map(|scale| {
            ConnectedScale::get_median_weight(scale, samples).map_err(AppError::Libra)
        })?
    }
    pub fn raw_scale_readings(&self) -> Result<Vec<f64>, AppError> {
        self.has_connected_scale()?;
        self.scale
            .as_ref()
            .map(|scale| ConnectedScale::get_raw_readings(scale).map_err(AppError::Libra))
            .unwrap()
    }
    pub fn get_raw_medians(&self, samples: usize) -> Result<[f64; 4], AppError> {
        if samples == 0 {
            return Err(AppError::ZeroSamples);
        }
        self.scale
            .as_ref()
            .ok_or(AppError::NoScale)
            .map(|scale| scale.get_raw_medians(samples).map_err(AppError::Libra))?
    }
    pub fn get_calibration_data(&self) -> Option<CalibrationData> {
        self.calibration_data.clone()
    }
    pub fn add_trial(&mut self, samples: usize, weight: f64) -> Result<Trial, AppError> {
        if samples == 0 {
            return Err(AppError::ZeroSamples);
        }
        if let Some(mut calibration_data) = self.calibration_data.clone() {
            let trial = Trial::from_array(self.get_raw_medians(samples)?, weight);
            calibration_data.add_trial(trial.clone());
            self.calibration_data.replace(calibration_data);
            Ok(trial)
        } else {
            Err(AppError::NoScale)
        }
    }
    pub fn call_calibration_backend(&self) -> Result<String, AppError> {
        let calibration_data = self.get_calibration_data().ok_or(AppError::NoScale)?;
        let client = reqwest::blocking::Client::new();
        // let url = "http://127.0.0.1:8080";
        let url = "https://us-west1-calibration-backend.cloudfunctions.net/test-function";
        let payload = serde_json::to_string(&calibration_data).map_err(AppError::Serde)?;
        client
            .post(url) // Changed to POST request
            .header(reqwest::header::CONTENT_TYPE, "application/json") // Use reqwest::header::CONTENT_TYPE
            .body(payload)
            .timeout(Duration::from_secs(60))
            .send()
            .map_err(AppError::Reqwest)?
            .text()
            .map_err(AppError::Reqwest)
    }
    pub fn get_coefficients_from_backend(&mut self) -> Result<String, AppError> {
        if let Some(scale) = &self.scale {
            let client = reqwest::blocking::Client::new();
            let url = format!(
                "https://us-west1-calibration-backend.cloudfunctions.net/test-function/{}",
                scale.get_phidget_id()
            );
            let response = client
                .get(url)
                .timeout(Duration::from_secs(60))
                .send()
                .map_err(AppError::Reqwest)?
                .text()
                .map_err(AppError::Reqwest)?;
            self.update_coefficients(
                serde_json::from_str::<Coefficients>(&response).map_err(AppError::Serde)?,
            )?;
            Ok(response)
        } else {
            Err(AppError::NoScale)
        }
    }
}
impl fmt::Display for AppData {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "Scale: {}, Coefficients: {:?}",
            self.scale.is_some(),
            self.coefficients
        )
    }
}
