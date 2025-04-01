use std::error::Error;
use std::fmt::Debug;
#[derive(thiserror::Error)]
pub enum PhidgetError {
    #[error("failed to connect to phidget")]
    ConnectionError(#[source] phidget::errors::Error),
}
impl Debug for PhidgetError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "{}", self)?;
        if let Some(source) = self.source() {
            writeln!(f, "Caused by:\n\t{}", source)?;
        }
        Ok(())
    }
}