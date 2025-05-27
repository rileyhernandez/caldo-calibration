use crate::errors::AppError;
use async_clear_core::{controller::ControllerHandle, motor::ClearCoreMotor};
use libra::scale::ConnectedScale;
use node_diagnostics::{data::Data, filter::Filter};
use std::time::Duration;
use serde::Deserialize;

pub struct Dispenser {}

impl Dispenser {
    pub async fn dispense(
        motor: &ClearCoreMotor,
        scale: ConnectedScale,
        settings: DispenseSettings,
    ) -> Result<(Data, ConnectedScale), AppError> {
        // Sleep to let button noise settle
        motor
            .set_velocity(settings.starting_velocity)
            .await
            .map_err(AppError::Anyhow)?;
        tokio::time::sleep(Duration::from_secs(2)).await;
        let start_time = tokio::time::Instant::now();

        let mut data = Data::new(10000);
        let sample_rate = 1. / settings.sample_period.as_secs_f64();
        let mut filter = Filter::new(sample_rate, settings.cutoff_frequency);
        let starting_weight = scale
            .get_median_weight(100, settings.sample_period)
            .map_err(AppError::Libra)?
            .get();
        // TODO: figure out what to do with this...
        filter.apply(starting_weight);
        let mut interval = tokio::time::interval(settings.sample_period);
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
        motor.relative_move(1000.).await.map_err(AppError::Anyhow)?;
        
        let mut checks_made = 0;
        loop {
            interval.tick().await;
            let curr_weight = filter.apply(scale.get_weight().map_err(AppError::Libra)?.get());
            data.push(tokio::time::Instant::now() - start_time, curr_weight);
            if curr_weight <= starting_weight - (settings.weight + settings.check_offset) {
                checks_made += 1;
                motor.abrupt_stop().await.map_err(AppError::Anyhow)?;
                let med_weight = scale
                    .get_median_weight(10, settings.sample_period)
                    .map_err(AppError::Libra)?
                    .get();
                if (med_weight > starting_weight - settings.weight) | (checks_made >= 3) {
                    break Ok((data, scale));
                } else {
                    filter = Filter::new(sample_rate, settings.cutoff_frequency);
                    filter.apply(med_weight);
                    motor.relative_move(1000.).await.map_err(AppError::Anyhow)?;
                    continue
                }
            }
            checks_made = 0;
        }
    }
}
#[derive(Deserialize, Debug)]
pub struct DispenseSettings {
    sample_period: Duration,
    cutoff_frequency: f64,
    check_offset: f64,
    weight: f64,
    starting_velocity: f64,
}
impl Default for DispenseSettings {
    fn default() -> Self {
        Self {
            sample_period: Duration::from_millis(80),
            cutoff_frequency: 2.0,
            check_offset: 5.,
            weight: 50.,
            starting_velocity: 0.2,
        }
    }
}
