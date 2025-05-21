use crate::backend::Backend;
use crate::data::DataRequest;
use crate::errors::AppError;
use crate::state::AppData;
use node_diagnostics::data::Data;
use std::sync::Mutex;
use std::time::Duration;
use crate::calibration_data::CalibrationTrial;

mod backend;
mod calibration_data;
mod data;
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
    state: tauri::State<'_, Mutex<AppData>>,
    data_request: DataRequest,
) -> Result<Data, AppError> {
    let mut state = state.lock().unwrap();
    let scale = state.get_mut_scale_ref().ok_or(AppError::NoScale)?;
    data_request.conduct(scale)
}
#[tauri::command(async)]
fn set_phidget_interval(state: tauri::State<'_, Mutex<AppData>>, sample_period: Duration) -> Result<(), AppError> {
    state.lock().unwrap().get_mut_scale_ref().ok_or(AppError::NoScale)?.set_data_intervals(sample_period).map_err(AppError::Libra)
}

#[tauri::command(async)]
fn enable_motor(state: tauri::State<'_, Mutex<AppData>>) -> Result<(), AppError> {
    state.lock().unwrap().enable_motor(0)
    // Err(AppError::NotImplemented)
}
#[tauri::command]
fn disable_motor(state: tauri::State<'_, Mutex<AppData>>) -> Result<(), AppError> {
    state.lock().unwrap().disable_motor(0)
    // Err(AppError::NotImplemented)
}
#[tauri::command]
fn conduct_trial(state: tauri::State<'_, Mutex<AppData>>) -> Result<(), AppError> {
    state.lock().unwrap().conduct_node_trial()?;
    Ok(())
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
            conduct_trial,
            set_phidget_interval
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
