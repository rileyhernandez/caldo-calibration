use crate::calibration_data::Coefficients;
use crate::errors::AppError;
use crate::state::AppData;
use std::sync::Mutex;
use std::time::Duration;
use tauri::State;

pub struct Backend {}
impl Backend {
    pub async fn get_coefficients(state: State<'_, Mutex<AppData>>) -> Result<String, AppError> {
        let scale = {
            let mut state = state.lock().unwrap();
            state.take_scale()?
        };
        let client = reqwest::Client::new();
        let url = format!(
            "https://us-west1-calibration-backend.cloudfunctions.net/test-function/{}",
            scale.get_phidget_id()
        );
        let response = client
            .get(url)
            .timeout(Duration::from_secs(60))
            .send()
            .await
            .map_err(AppError::Reqwest)?
            .text()
            .await
            .map_err(AppError::Reqwest)?;
        {
            let mut state = state.lock().unwrap();
            state.return_scale(scale)?;
            state.update_coefficients(
                serde_json::from_str::<Coefficients>(&response).map_err(AppError::Serde)?,
            )?;
        }

        Ok(response)
    }
    pub async fn calibrate(state: State<'_, Mutex<AppData>>) -> Result<String, AppError> {
        let calibration_data = {
            state
                .lock()
                .unwrap()
                .get_calibration_data()
                .ok_or(AppError::NoScale)?
        };
        let client = reqwest::Client::new();
        let url = "https://us-west1-calibration-backend.cloudfunctions.net/test-function";
        let payload = serde_json::to_string(&calibration_data).map_err(AppError::Serde)?;
        client
            .post(url)
            .header(reqwest::header::CONTENT_TYPE, "application/json")
            .body(payload)
            .timeout(Duration::from_secs(60))
            .send()
            .await
            .map_err(AppError::Reqwest)?
            .text()
            .await
            .map_err(AppError::Reqwest)
    }
}
