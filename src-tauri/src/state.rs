use crate::calibration_data::{CalibrationData, CalibrationTrial, Coefficients};
use crate::errors::AppError;
use clear_core::controller::clear_core::Controller;
use clear_core::controller::motor::Motor;
use libra::scale::ConnectedScale;
use node_diagnostics::trial::Trial as NodeTrial;
use std::fmt;
use std::time::Duration;

pub struct AppData {
    scale: Option<ConnectedScale>,
    coefficients: Option<[f64; 4]>,
    calibration_data: Option<CalibrationData>,
    controller: Option<Controller>,
}
impl AppData {
    pub fn new() -> Self {
        Self {
            scale: None,
            coefficients: None,
            calibration_data: None,
            controller: None,
        }
    }
    // pub fn get_scale_ref(&self) -> Option<&ConnectedScale> {
    //     if let Some(scale) = &self.scale {
    //         Some(scale)
    //     } else {
    //         None
    //     }
    // }
    pub fn get_mut_scale_ref(&mut self) -> Option<&mut ConnectedScale> {
        self.scale.as_mut()
    }
    fn has_connected_scale(&self) -> Result<(), AppError> {
        if self.scale.is_some() {
            Ok(())
        } else {
            Err(AppError::NoScale)
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
    pub fn get_calibration_data(&self) -> Option<CalibrationData> {
        self.calibration_data.clone()
    }

    pub fn conduct_node_trial(&self) -> Result<(), AppError> {
        let data = NodeTrial::default()
            .conduct(self.scale.as_ref().ok_or(AppError::NoScale)?)
            .map_err(AppError::NodeDiagnostics)?;
        println!("DEBUG: {:?}", data);
        Err(AppError::NotImplemented)
    }

    pub fn add_calibration_trial(&mut self, calibration_trial: CalibrationTrial) -> Result<CalibrationTrial, AppError> {
        if let Some(mut calibration_data) = self.calibration_data.take() {
            calibration_data.add_trial(calibration_trial.clone());
            self.calibration_data.replace(calibration_data);
            Ok(calibration_trial)
        } else {
            Err(AppError::NoScale)
        }
    }
    fn get_controller(&mut self) -> Result<&mut Controller, AppError> {
        Ok(self
            .controller
            .get_or_insert(Controller::new("192.168.1.12:8888").map_err(AppError::ClearCoreIo)?))
    }
    // pub fn get_motor(&mut self, id: u8, steps: usize) -> Result<Motor, AppError> {
    //     self.get_controller()
    //         .map(|_cc| Motor::new(id, steps))
    // }
    pub fn enable_motor(&mut self, id: u8) -> Result<(), AppError> {
        self.get_controller()
            .map(|cc| Motor::new(id, 800).enable(cc).map_err(AppError::ClearCore))?
    }
    pub fn disable_motor(&mut self, id: u8) -> Result<(), AppError> {
        self.get_controller()
            .map(|cc| Motor::new(id, 800).disable(cc).map_err(AppError::ClearCore))?
    }
    pub fn take_scale(&mut self) -> Result<ConnectedScale, AppError> {
        self.scale.take().ok_or(AppError::NoScale)
    }
    pub fn return_scale(&mut self, scale: ConnectedScale) -> Result<(), AppError> {
        if self.scale.is_none() {
            self.scale.replace(scale);
            Ok(())
        } else {
            Err(AppError::ScaleExists)
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
