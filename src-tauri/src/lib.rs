use crate::state::AppData;
use std::{array, sync::Mutex, time::Duration};
use calibrate::calibrate_app;
use libra::scale::ScaleError;
use state::{AppError, Message, State};
use tauri::Manager;
use faer::{col, linalg::solvers::SolveLstsqCore, prelude::*};

mod calibrate;
mod errors;
mod state;

pub const TEST: usize = 5;
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command(rename_all = "snake_case")]
fn my_custom_command(_invoke_message: String) -> String {
    // invoke_message
    "worked!".into()
}

#[derive(Default)]
struct MyState {
  s: std::sync::Mutex<String>,
  t: std::sync::Mutex<std::collections::HashMap<String, String>>,
}
// remember to call `.manage(MyState::default())`
#[tauri::command]
fn check_app_data(state: tauri::State<'_, Mutex<AppData>>) -> String {
    format!("{:}", state.lock().unwrap())
}
#[tauri::command]
fn check_state(state: tauri::State<'_, Mutex<AppData>>) -> String {
    format!("{:?}", state.lock().unwrap().get_state())
}
#[tauri::command]
fn request_state(state: tauri::State<'_, Mutex<AppData>>, new_state: String) -> String {
    let mut state = state.lock().unwrap();
    state.set_state_from_ui(&new_state);
    println!("Current State: {:}", state);
    format!("Received: {}", new_state)
}

// Replace the above??

#[tauri::command]
fn connect_scale(state: tauri::State<'_, Mutex<AppData>>) -> Result<String, String> {
    match state.lock().unwrap().connect_scale() {
        Ok(_) => Ok(Message::ScaleConnected.string()),
        Err(e) => Err(format!("{:?}", e))
    }
}

#[tauri::command]
fn check_raw_readings(state: tauri::State<'_, Mutex<AppData>>) -> Result<String, String> {
    match state.lock().unwrap().raw_scale_readings() {
        Ok(readings) => Ok(format!("{:?}", readings)),
        Err(e) => Err(format!("{:?}", e))
    }
}

#[tauri::command]
fn weigh_scale(state: tauri::State<'_, Mutex<AppData>>, samples: usize) -> Result<f64, String> {
    match state.lock().unwrap().weigh_scale(samples) {
        Ok(readings) => Ok(readings),
        Err(e) => Err(format!("{:?}", e))
    }
}

#[tauri::command]
fn add_weight_trial(state: tauri::State<'_, Mutex<AppData>>, samples: usize) -> Result<String, String> {
    let mut state = state.lock().unwrap();
    let trial = match state.get_raw_medians(samples) {
        Ok(t) => t,
        Err(e) => return Err(e.string())
    };
    state.add_trial(trial);
    Ok(format!("{:?}", state.get_calibration_data()))
}

#[tauri::command]
fn add_zero_trial(state: tauri::State<'_, Mutex<AppData>>, samples: usize) -> Result<String, String> {
    let mut state = state.lock().unwrap();
    let trial = match state.get_raw_medians(samples) {
        Ok(t) => t,
        Err(e) => return Err(e.string())
    };
    state.add_zero_trial(trial);
    Ok(format!("{:?}", state.get_calibration_data()))
}

#[tauri::command]
fn get_calibration_data(state: tauri::State<'_, Mutex<AppData>>) -> Result<String, String> {
    // let state = state.lock().unwrap();
    // Ok(format!("{:?}", state.get_calibration_data()))

    let A = mat![
        [10.0, 3.0],
        [2.0, -10.0],
        [3.0, -45.0],
    ];
    let b = col![15.0, -3.0, 13.1];
    let mut t = mat![
        [15.],
        [-3.],
        [13.1]
    ];

    let data = state.lock().unwrap().get_calibration_data().clone();
    // let A = mat![data.get_weight_trials];

    // compute the qr decomposition.
    let qr = A.qr();
    qr.solve_lstsq_in_place_with_conj(faer::Conj::No, t.as_mut());

    Ok(format!("idk: {:?}", t))

}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // let mut error

    // let mut phidget = Phidget::new();
    // if phidget.open_wait(Duration::from_secs(5))

    tauri::Builder::default()
        .manage(Mutex::new(AppData::new()))
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            let app_handle = app.app_handle();

            tauri::async_runtime::spawn({
                let app_handle = app_handle.clone();
                async move {
                    let state = loop {
                        match app_handle.try_state() {
                            Some(state) => {
                                break state;
                            }
                            None => tokio::time::sleep(std::time::Duration::from_millis(50)).await,
                        }
                    };
                    calibrate_app(state).await;
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet, 
            my_custom_command, 
            request_state, 
            check_app_data, 
            check_raw_readings, 
            weigh_scale, 
            connect_scale, 
            add_weight_trial,
            add_zero_trial,
            get_calibration_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
