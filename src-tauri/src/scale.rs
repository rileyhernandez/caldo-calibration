use libra::ConnectedScale;
use crate::errors;

pub struct Scale {
    scale: ConnectedScale
}
impl Scale {
    pub fn new() -> Result<Scale, errors::PhidgetError> {
        let a = ConnectedScale::without_id(Duration::from_secs(3));
    }
}