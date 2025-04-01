use std::sync::Mutex;
// use crate::state::{AppData, Phidget};

mod errors;
mod state;
mod scale;

pub const TEST: usize = 5;
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command(rename_all = "snake_case")]
fn my_custom_command(invoke_message: String) -> String {
    // invoke_message
    "worked!".into()
}

// #[tauri::command]
// fn connect() -> String {
//     let mut phidget = VoltageRatioInput::new();
//     if phidget.open_wait(Duration::from_secs(5)).is_err() {
//         return "failed to connect".into()
//     }
//     if let Ok(sn) = phidget.serial_number() {
//         sn.to_string()
//     } else {
//         "failed to get sn".into()
//     }
// }

#[tauri::command]
fn 



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // let mut error
    
    // let mut phidget = Phidget::new();
    // if phidget.open_wait(Duration::from_secs(5))
    
    tauri::Builder::default()
        // .manage(Mutex::new(AppData::new()))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, my_custom_command])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}