use crate::errors::AppError;
use async_clear_core::{motor::ClearCoreMotor};
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
        Err(AppError::NotImplemented)
    }
    //     motor
    //         .set_velocity(settings.max_velocity)
    //         .await
    //         .map_err(AppError::Anyhow)?;
    //     tokio::time::sleep(Duration::from_secs(2)).await;
    // 
    //     let mut data = Data::new(10000);
    //     let sample_rate = 1. / settings.sample_period.as_secs_f64();
    //     let mut filter = Filter::new(sample_rate, settings.cutoff_frequency);
    //     let starting_weight = scale
    //         .get_median_weight(100, settings.sample_period)
    //         .map_err(AppError::Libra)?
    //         .get();
    //     // TODO: figure out what to do with this...
    //     filter.apply(starting_weight);
    //     
    //     let mut interval = tokio::time::interval(settings.sample_period);
    //     interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
    //     motor.relative_move(1000.).await.map_err(AppError::Anyhow)?;
    //     let mut last_speed_update = tokio::time::Instant::now();
    //     
    //     // let starting_weight = scale
    //     //     .get_median_weight(10, settings.sample_period)
    //     //     .map_err(AppError::Libra)?
    //     //     .get();
    //     // // TODO: figure out what to do with this...
    //     // filter.apply(starting_weight);
    //     
    //     let start_time = tokio::time::Instant::now();
    //     let mut checks_made = 0;
    //     let result = loop {
    //         interval.tick().await;
    //         let curr_weight = filter.apply(scale.get_weight().map_err(AppError::Libra)?.get());
    //         let now = tokio::time::Instant::now();
    //         data.push(now - start_time, curr_weight);
    //         
    //         if (tokio::time::Instant::now() - last_speed_update > Duration::from_millis(25)) && (now-start_time > settings.start_buffer) {
    //             let err = (curr_weight - starting_weight + settings.weight)/settings.weight;
    //             let new_speed  = err*settings.max_velocity;
    //             if new_speed > settings.max_velocity {
    //                 motor.set_velocity(settings.max_velocity).await.map_err(AppError::Anyhow)?;
    //             } else if new_speed > settings.min_velocity {
    //                 motor.set_velocity(new_speed).await.map_err(AppError::Anyhow)?;
    //             }  else {
    //                 motor.set_velocity(settings.min_velocity).await.map_err(AppError::Anyhow)?;
    //             }
    //             last_speed_update = tokio::time::Instant::now();
    //             motor.relative_move(1000.).await.map_err(AppError::Anyhow)?;
    //         }
    //         
    //         if curr_weight <= starting_weight - (settings.weight - settings.check_offset) && (now-start_time > settings.start_buffer) {
    //             checks_made += 1;
    //             motor.abrupt_stop().await.map_err(AppError::Anyhow)?;
    //             tokio::time::sleep(Duration::from_millis(50)).await;
    //             let med_weight = scale
    //                 .get_median_weight(100, settings.sample_period)
    //                 .map_err(AppError::Libra)?
    //                 .get();
    //             data.push(tokio::time::Instant::now() - start_time, med_weight);
    //             if (med_weight <= starting_weight - settings.weight) | (checks_made >= 3) {
    //                 break Ok((data, scale))
    //             } else {
    //                 filter = Filter::new(sample_rate, settings.cutoff_frequency);
    //                 filter.apply(med_weight);
    //                 motor.relative_move(1000.).await.map_err(AppError::Anyhow)?;
    //                 // continue
    //             }
    //         }
    //         if tokio::time::Instant::now() - start_time > settings.timeout {
    //             motor.abrupt_stop().await.map_err(AppError::Anyhow)?;
    //             break Err(AppError::DispenseTimeout((data, scale)))
    //         }
    //         checks_made = 0;
    //     };
    //     motor.relative_move(-settings.retract).await.map_err(AppError::Anyhow)?;
    //     tokio::time::sleep(Duration::from_millis(25)).await;
    //     motor.wait_for_move(Duration::from_millis(10)).await.map_err(AppError::Anyhow)?;
    //     result
    // }
}
#[derive(Deserialize, Debug)]
pub struct DispenseSettings {
    sample_period: Duration,
    cutoff_frequency: f64,
    check_offset: f64,
    weight: f64,
    max_velocity: f64,
    min_velocity: f64,
    retract: f64,
    timeout: Duration,
    start_buffer: Duration
}
impl Default for DispenseSettings {
    fn default() -> Self {
        Self {
            sample_period: Duration::from_millis(80),
            cutoff_frequency: 2.0,
            check_offset: 5.,
            weight: 50.,
            max_velocity: 0.5,
            min_velocity: 0.1,
            retract: 0.1,
            timeout: Duration::from_secs(30),
            start_buffer: Duration::from_millis(500)
        }
    }
}
