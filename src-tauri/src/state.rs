use crate::calibration_data::{CalibrationData, CalibrationTrial, Coefficients};
use crate::errors::AppError;
use async_clear_core::controller::ControllerHandle;
use async_clear_core::motor::{MotorBuilder};
use libra::scale::ConnectedScale;
use std::time::Duration;
use std::{array, fmt, thread};
use control_components::{controllers::clear_core};
use control_components::components::clear_core_motor::ClearCoreMotor;

pub struct AppData {
    scale: Option<ConnectedScale>,
    coefficients: Option<[f64; 4]>,
    calibration_data: Option<CalibrationData>,
    controller: Option<ControllerHandle>,
    clear_core: Option<clear_core::Controller>,
}
impl AppData {
    pub fn new() -> Self {
        Self {
            scale: None,
            coefficients: None,
            calibration_data: None,
            controller: None,
            clear_core: None
        }
    }
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
        let mut scale =
            ConnectedScale::without_id(Duration::from_secs(3)).map_err(AppError::Libra)?;
        scale
            .set_data_intervals(Duration::from_millis(40))
            .map_err(AppError::Libra)?;
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

    pub fn add_calibration_trial(
        &mut self,
        calibration_trial: CalibrationTrial,
    ) -> Result<CalibrationTrial, AppError> {
        if let Some(mut calibration_data) = self.calibration_data.take() {
            calibration_data.add_trial(calibration_trial.clone());
            self.calibration_data.replace(calibration_data);
            Ok(calibration_trial)
        } else {
            Err(AppError::NoScale)
        }
    }
    fn get_controller(&mut self) -> &ControllerHandle {
        self.controller.get_or_insert(ControllerHandle::new(
            "192.168.1.12:8888",
            array::from_fn(|_| MotorBuilder { id: 0, scale: 800 }),
        ))
    }
    pub fn get_motor(&mut self, id: usize) -> ClearCoreMotor {
        if self.clear_core.is_none() {
            let (controller, controller_client) = clear_core::Controller::with_client(
                "192.168.1.12:8888",
                &[
                    clear_core::MotorBuilder {
                        id: 0,
                        scale: 800,
                    },
                    clear_core::MotorBuilder {
                        id: 1,
                        scale: 800,
                    },
                ],
            );
            tauri::async_runtime::spawn(async move {
                if let Err(_) = controller_client.await {
                    println!("No motor/io controller connected...");
                }
            });
            thread::sleep(Duration::from_secs(5));
            let motor = controller.get_motor(id);
            self.clear_core.replace(controller);
            motor
        } else {
            self.clear_core.clone().unwrap().get_motor(id)
        }
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
