use crate::backend::Backend;
use crate::calibration_data::CalibrationTrial;
use crate::data::{DataRequest, LoadCellDataRequest};
use crate::dispenser::{DispenseSettings, Dispenser};
use crate::errors::AppError;
use crate::state::AppData;
use node_diagnostics::data::Data;
use std::sync::Mutex;
use std::time::Duration;
use tauri::State;

mod backend;
mod calibration_data;
mod data;
mod dispenser;
mod errors;
mod state;

#[tauri::command]
fn check_app_data(state: tauri::State<'_, Mutex<AppData>>) -> String {
    format!("{:}", state.lock().unwrap())
}

#[tauri::command(async)]
fn connect_scale(state: tauri::State<'_, Mutex<AppData>>) -> Result<String, AppError> {
    match state.lock().unwrap().connect_scale() {
        Ok(_) => Ok("Scale Connected!".into()),
        Err(e) => Err(e),
    }
}

#[tauri::command(async)]
fn add_trial(
    state: tauri::State<'_, Mutex<AppData>>,
    samples: usize,
    weight: f64,
    sample_period: Duration,
) -> Result<String, AppError> {
    let new_trial = CalibrationTrial::new(state.clone(), samples, weight, sample_period)?;
    let trial = state.lock().unwrap().add_calibration_trial(new_trial)?;
    serde_json::to_string(&trial).map_err(AppError::Serde)
}

#[tauri::command(async)]
async fn calibrate(state: tauri::State<'_, Mutex<AppData>>) -> Result<String, AppError> {
    Backend::calibrate(state).await
}

#[tauri::command(async)]
async fn get_coefficients(state: tauri::State<'_, Mutex<AppData>>) -> Result<String, AppError> {
    Backend::get_coefficients(state).await
}

#[tauri::command(async)]
fn plot(
    state: State<'_, Mutex<AppData>>,
    data_request: DataRequest,
) -> Result<Data, AppError> {
    let mut state = state.lock().unwrap();
    let scale = state.get_mut_scale_ref().ok_or(AppError::NoScale)?;
    data_request.conduct(scale)
}
#[tauri::command(async)]
fn plot_lc(state: State<'_, Mutex<AppData>>, data_request: LoadCellDataRequest) -> Result<[Data; 4], AppError> {
    let mut state = state.lock().unwrap();
    let scale = state.get_mut_scale_ref().ok_or(AppError::NoScale)?;
    let data = data_request.conduct(scale)?;
    Ok(data)
}
#[tauri::command(async)]
fn set_phidget_interval(
    state: tauri::State<'_, Mutex<AppData>>,
    sample_period: Duration,
) -> Result<(), AppError> {
    state
        .lock()
        .unwrap()
        .get_mut_scale_ref()
        .ok_or(AppError::NoScale)?
        .set_data_intervals(sample_period)
        .map_err(AppError::Libra)
}

#[tauri::command]
async fn enable_motor(state: tauri::State<'_, Mutex<AppData>>) -> Result<(), AppError> {
    let motor = { state.lock().unwrap().get_motor(0) };
    motor.enable().await.map_err(AppError::Anyhow)
}
#[tauri::command]
async fn disable_motor(state: tauri::State<'_, Mutex<AppData>>) -> Result<(), AppError> {
    let motor = { state.lock().unwrap().get_motor(0) };
    motor.disable().await.map_err(AppError::Anyhow)
}
#[tauri::command]
async fn move_motor(state: tauri::State<'_, Mutex<AppData>>) -> Result<(), AppError> {
    let motor = { state.lock().unwrap().get_motor(0) };
    motor.relative_move(10.).await.map_err(AppError::Anyhow)?;
    Ok(())
}
#[tauri::command]
async fn dispense(state: tauri::State<'_, Mutex<AppData>>, dispense_settings: DispenseSettings) -> Result<Data, AppError> {
    let (scale, motor) = {
        let mut state = state.lock().unwrap();
        let scale = state.take_scale()?;
        let motor = state.get_motor(0);
        (scale, motor)
    };
    // let settings = DispenseSettings::default();
    motor.enable().await.map_err(AppError::Anyhow)?;
    let (data, scale) = Dispenser::dispense(&motor, scale, dispense_settings).await?;
    state.lock().unwrap().return_scale(scale)?;
    Ok(data)
    // Err(AppError::NotImplemented)
}
#[tauri::command(async)]
fn drop_scale(state: State<'_, Mutex<AppData>>) -> Result<(), AppError> {
    let mut state = state.lock().unwrap();
    let _ = state.take_scale()?;
    Ok(())
}
#[tauri::command(async)]
fn setup_raw_data_collection(state: State<'_, Mutex<AppData>>) -> Result<(), AppError> {
    let mut state = state.lock().unwrap();
    let _scale = state.take_scale()?;
    // TODO: need to implement this up a crate...
    Err(AppError::NotImplemented)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(AppData::new()))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            check_app_data,
            connect_scale,
            add_trial,
            calibrate,
            get_coefficients,
            plot,
            enable_motor,
            disable_motor,
            set_phidget_interval,
            dispense,
            move_motor,
            drop_scale,
            setup_raw_data_collection,
            plot_lc
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
