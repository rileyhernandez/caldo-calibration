use libra::scale::ScaleError;
use log::error;
// use phidget::ReturnCode;
use anyhow;
use serde::Serialize;
use std::fmt::Debug;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("No Scale Connected!")]
    NoScale,
    #[error("Scale Error: {0}")]
    Libra(ScaleError),
    // #[error("Phidget Error: {0}")]
    // Phidget(PhidgetError),
    // #[error("Must Calibrate Scale to Use!")]
    // NotCalibrated,
    #[error("Must have nonzero samples!")]
    ZeroSamples,
    #[error("HTTP Request Error: {0}")]
    Reqwest(reqwest::Error),
    #[error("Serialization Error: {0}")]
    Serde(serde_json::Error),
    #[error("This feature is not yet implemented!")]
    NotImplemented,
    #[error("")]
    Anyhow(anyhow::Error),
    #[error("Node Diagnostics Error: {0}")]
    NodeDiagnostics(node_diagnostics::error::Error),
    #[error("Scale already exists!")]
    ScaleExists,
    #[error("Other Error: {0}")]
    Other(String),
}
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        error!("{self}");
        serializer.serialize_str(self.to_string().as_ref())
    }
}
