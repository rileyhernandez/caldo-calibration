use libra::scale::{ConnectedScale, ScaleError};
use log::error;
// use phidget::ReturnCode;
use anyhow;
use serde::Serialize;
use std::fmt::Debug;
use node_diagnostics::data::Data;
use thiserror::Error;

#[derive(Error, )]
pub enum AppError {
    #[error("No Scale Connected!")]
    NoScale,
    #[error("Scale Error: {0}")]
    Libra(ScaleError),
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
    Other(String)
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
impl Debug for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::NoScale => write!(f, "NoScale"),
            AppError::Libra(err) => f.debug_tuple("Libra").field(err).finish(),
            AppError::ZeroSamples => write!(f, "ZeroSamples"),
            AppError::Reqwest(err) => f.debug_tuple("Reqwest").field(err).finish(),
            AppError::Serde(err) => f.debug_tuple("Serde").field(err).finish(),
            AppError::NotImplemented => write!(f, "NotImplemented"),
            AppError::Anyhow(err) => f.debug_tuple("Anyhow").field(err).finish(),
            AppError::NodeDiagnostics(err) => f.debug_tuple("NodeDiagnostics").field(err).finish(),
            AppError::ScaleExists => write!(f, "ScaleExists"),
            AppError::Other(s) => f.debug_tuple("Other").field(s).finish(),
            // AppError::DispenseTimeout((data, _scale)) => {
            //     // Assuming Data implements Debug.
            //     // For _scale, provide a placeholder as it doesn't implement Debug.
            //     f.debug_struct("DispenseTimeout")
            //         .field("data", data)
            //         .field("scale", &"<ConnectedScale (not Debug)>")
            //         .finish()
            // }
        }
    }
}
