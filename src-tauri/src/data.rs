use crate::errors::AppError;
use libra::scale::ConnectedScale;
use node_diagnostics::data::Data;
use node_diagnostics::filter::Filter;
use node_diagnostics::trial::{WeightTrial as NodeTrial, WeightTrialType, LoadCellTrial};
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Deserialize, Serialize)]
pub enum TestType {
    Filtered,
    Raw,
    Median,
    Dispense,
}
#[derive(Deserialize, Serialize)]
pub struct DataRequest {
    trial: TestType,
    samples: usize,
    sample_period: Duration,
    cutoff_frequency: Option<f64>,
}
impl DataRequest {
    pub fn conduct(self, scale: &mut ConnectedScale) -> Result<Data, AppError> {
        let trial = self.to_node_trial()?;
        // TODO: this should be done elsewhere
        // scale
        //     .set_data_intervals(self.sample_period)
        //     .map_err(AppError::Libra)?;
        let mut data = trial.conduct(scale).map_err(AppError::NodeDiagnostics)?;
        // TODO: figure out how to remove this in node-diagnostics
        if !data.readings.is_empty() {
            data.readings.remove(0);
            data.times.remove(0);
        }
        Ok(data)
    }
    fn to_node_trial(&self) -> Result<NodeTrial, AppError> {
        let trial = match self.trial {
            TestType::Raw => WeightTrialType::Raw,
            TestType::Median => WeightTrialType::Median,
            TestType::Filtered => {
                let sample_rate = 1. / self.sample_period.as_secs_f64();
                let filter = Filter::new(
                    sample_rate,
                    self.cutoff_frequency.ok_or(AppError::Other(
                        "Missing cutoff frequency for filtered trial!".into(),
                    ))?,
                );
                WeightTrialType::Filtered(filter)
            }
            _ => return Err(AppError::NotImplemented),
        };
        Ok(NodeTrial::new(trial, self.samples, self.sample_period))
    }
}
#[derive(Deserialize, Serialize)]
pub struct LoadCellDataRequest {
    samples: usize,
    sample_period: Duration
}
impl LoadCellDataRequest {
    pub fn conduct(self, scale: &mut ConnectedScale) -> Result<[Data; 4], AppError> {
        let trial = LoadCellTrial::new(self.samples, self.sample_period);
        let mut data = trial.conduct(scale).map_err(AppError::NodeDiagnostics)?;
        if !data[0].readings.is_empty() {
            for datum in &mut data {
                datum.readings.remove(0);
                datum.times.remove(0);
            }
        }
        Ok(data)
    }
}