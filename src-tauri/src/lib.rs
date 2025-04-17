use crate::state::AppData;
use std::sync::Mutex;
use state::Message;
use crate::errors::AppError;

mod errors;
mod state;
mod calibration_data;

#[tauri::command]
fn check_app_data(state: tauri::State<'_, Mutex<AppData>>) -> String {
    format!("{:}", state.lock().unwrap())
}

#[tauri::command]
fn connect_scale(state: tauri::State<'_, Mutex<AppData>>) -> Result<String, AppError> {
    match state.lock().unwrap().connect_scale() {
        Ok(_) => Ok("Scale Connected!".into()),
        Err(e) => Err(e)
    }
}

#[tauri::command]
fn check_raw_readings(state: tauri::State<'_, Mutex<AppData>>) -> Result<Vec<f64>, AppError> {
    state.lock().unwrap().raw_scale_readings()
}

#[tauri::command]
fn weigh_scale(state: tauri::State<'_, Mutex<AppData>>, samples: usize) -> Result<f64, AppError> {
    state.lock().unwrap().weigh_scale(samples)
}

#[tauri::command]
fn add_trial(state: tauri::State<'_, Mutex<AppData>>, samples: usize, weight: f64) -> Result<String, AppError> {
    let mut state = state.lock().unwrap();
    state.add_trial(samples, weight)?;
    Ok(format!("{:?}", state.get_calibration_data()))
}

#[tauri::command]
fn calibrate(state: tauri::State<'_, Mutex<AppData>>) -> Result<String, AppError> {
    let state = state.lock().unwrap();
    state.call_calibration_backend()
}

#[tauri::command]
fn get_coefficients(state: tauri::State<'_, Mutex<AppData>>) -> Result<String, AppError> {
    state.lock().unwrap().get_coefficients_from_backend()
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(AppData::new()))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            check_app_data, 
            check_raw_readings, 
            weigh_scale, 
            connect_scale, 
            add_trial,
            calibrate,
            get_coefficients
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
