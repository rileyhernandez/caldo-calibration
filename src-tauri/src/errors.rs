use libra::scale;
use std::error::Error;
use std::fmt::Debug;
use thiserror::Error;

// #[derive(Error)]
// pub enum ScaleError {
//     #[error("Failed to connect to Scale")]
//     ConnectionError(#[from] scale::Error),
// }
// impl Debug for ScaleError {
//     fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
//         writeln!(f, "{}", self)?;
//         if let Some(source) = self.source() {
//             writeln!(f, "Caused by:\n\t{}", source)?;
//         }
//         Ok(())
//     }
// }
