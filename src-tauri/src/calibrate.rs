use crate::state::{AppData, AppError, State};
use control_components::controllers::clear_core::{Controller, MotorBuilder};
use libra::scale::ScaleError;
use phidget::ReturnCode;
use std::{
    net::{Ipv4Addr, SocketAddrV4},
    sync::Mutex,
    time::Duration,
};

pub async fn calibrate_app(state: tauri::State<'_, Mutex<AppData>>) {


    // const CC: &str = "192.168.1.12:8888";
    // const ADDR: Ipv4Addr = Ipv4Addr::new(0, 0, 0, 0);
    // const PORT: u16 = 5000;
    // const MOTOR_ID: u8 = 0;
    // let motor = MotorBuilder {
    //     id: MOTOR_ID,
    //     scale: 800,
    // };
    // let sock = SocketAddrV4::new(ADDR, PORT);
    // let (cc, client) = Controller::with_client(sock, &[motor]);

    // tauri::async_runtime::spawn(async move {
    //     if client.await.is_err() {
    //         // log::warn!("No motor/io controller connected, running in demo mode");
    //     }
    // });
    // // enable motor
    // let _ = cc.get_motor(MOTOR_ID as usize).enable().await;

    println!("calibrate running");
    loop {
        let state = state.clone();
        let curr_state = { state.lock().unwrap().get_state() };
        // let state = app_state;
        match curr_state {
            State::Idle | State::Failure(_) => {
                tokio::time::sleep(Duration::from_millis(50)).await;
            }
            State::Connect => {
                handle_connect_scale(state).await;
            }
            State::Calibrate => {
                // replace w handle_calibrate_state later
                handle_raw_scale_readings(state).await;
            }
        }
        // tokio::time::sleep(Duration::from_millis(50)).await;
    }
    
}

async fn handle_connect_scale(state: tauri::State<'_, Mutex<AppData>>) {
    let mut state = state.lock().unwrap();
    if let Err(e) = state.connect_scale() {
        state.set_state(State::Failure(e));
    } else {
        state.set_state(State::Idle);
    }
}

async fn handle_calibrate_state(state: tauri::State<'_, Mutex<AppData>>) {
    // need to work out calibration process, copy jorge's code for how to keep releasing mutex
}

async fn handle_raw_scale_readings(state: tauri::State<'_, Mutex<AppData>>) {
    let mut state = state.lock().unwrap();
    if let Err(e) = state.raw_scale_readings() {
        state.set_state(State::Failure(e));
    } else {
        state.set_state(State::Idle);
    }
}
