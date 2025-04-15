use std::fmt::Debug;
use libra::scale::ScaleError;
use phidget::ReturnCode;
use thiserror::Error;
use serde::Serialize;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("No Scale Connected!")]
    NoScale,
    #[error("Scale Error")]
    Libra(ScaleError),
    #[error("Phidget Error")]
    Phidget(ReturnCode),
    #[error("Must Calibrate Scale to Use!")]
    NotCalibrated,
    #[error("Must have nonzero samples!")]
    ZeroSamples,
    #[error("HTTP Request Error")]
    Reqwest(reqwest::Error),
    #[error("Serialization Error")]
    Serde(serde_json::Error)
}
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}