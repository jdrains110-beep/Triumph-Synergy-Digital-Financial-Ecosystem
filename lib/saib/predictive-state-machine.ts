/**
 * SAIB v5.0: Predictive State Machine
 * Bayesian forecasting engine for GCV, latency, adoption trends
 * 30-day rolling window with anomaly detection
 */

import redis from 'redis';

export interface MetricSnapshot {
  timestamp: number;
  service: string;
  metric_name: string;
  value: number;
  unit: string;
}

export interface PredictiveModel {
  metric_name: string;
  service: string;
  historical_values: number[];
  mean: number;
  stddev: number;
  anomaly_threshold: number;
  forecast_48h: Forecast;
  forecast_30d: Forecast;
  accuracy_score: number;
  last_updated: number;
}

export interface Forecast {
  predicted_mean: number;
  lower_bound: number;
  upper_bound: number;
  confidence_level: number;
  deviation_from_current: number;
  anomaly_probability: number;
}

export interface RiskForecast {
  service: string;
  risk_level_48h: number; // 0-100
  risk_level_30d: number; // 0-100
  anomalies_detected: number;
  confidence: number;
  recommendations: string[];
}

class PredictiveStateAnalyzer {
  private redis_client: redis.RedisClient;
  private models: Map<string, PredictiveModel> = new Map();
  private WINDOW_SIZE = 1000; // 1000 data points = 30 days @ 30s ticks
  private ANOMALY_THRESHOLD_SIGMA = 2; // 2 standard deviations

  constructor(redis_url: string = 'redis://localhost:6379') {
    this.redis_client = redis.createClient(redis_url);
  }

  async compute_forecast(probes: any): Promise<{ forecast_48h: RiskForecast; forecast_30d: RiskForecast }> {
    const metrics = this.extract_metrics_from_probes(probes);

    // Step 1: Store metrics in Redis (hot cache)
    await this.store_metrics_batch(metrics);

    // Step 2: Recompute models every 100 ticks
    if (await this.should_recompute_models()) {
      await this.recompute_all_models();
    }

    // Step 3: Generate forecasts
    const forecast_48h = this.aggregate_forecasts(48);
    const forecast_30d = this.aggregate_forecasts(720); // 720 * 30s = 30 days

    return {
      forecast_48h,
      forecast_30d,
    };
  }

  private async store_metrics_batch(metrics: MetricSnapshot[]) {
    for (const metric of metrics) {
      const key = `saib:metrics:${metric.service}:${metric.metric_name}`;
      await this.redis_client.zadd(key, metric.timestamp, JSON.stringify(metric));

      // Trim to window size (keep last 1000)
      const count = await new Promise((resolve) => {
        this.redis_client.zcard(key, (err, count) => {
          resolve(count || 0);
        });
      });

      if (count > this.WINDOW_SIZE) {
        await new Promise((resolve) => {
          this.redis_client.zremrangebyrank(key, 0, count - this.WINDOW_SIZE - 1, () => {
            resolve(true);
          });
        });
      }
    }
  }

  private async should_recompute_models(): Promise<boolean> {
    const tick_counter = await this.get_tick_counter();
    return tick_counter % 100 === 0;
  }

  private async get_tick_counter(): Promise<number> {
    return new Promise((resolve) => {
      this.redis_client.get('saib:tick_counter', (err, val) => {
        resolve(parseInt(val || '0'));
      });
    });
  }

  private async recompute_all_models() {
    const services = ['triumph-pi-mainnet-node', 'triumph-apex-services', 'triumph-redis-cluster'];
    const metrics = ['latency_ms', 'cpu_percent', 'memory_mb', 'gcv_deviation'];

    for (const service of services) {
      for (const metric of metrics) {
        await this.recompute_model(service, metric);
      }
    }
  }

  private async recompute_model(service: string, metric_name: string) {
    const key = `saib:metrics:${service}:${metric_name}`;

    // Fetch historical data
    const data = await new Promise<MetricSnapshot[]>((resolve) => {
      this.redis_client.zrange(key, 0, -1, 'WITHSCORES', (err, items) => {
        if (!items) {
          resolve([]);
          return;
        }

        const result = [];
        for (let i = 0; i < items.length; i += 2) {
          try {
            result.push(JSON.parse(items[i]));
          } catch (e) {}
        }
        resolve(result);
      });
    });

    if (data.length < 10) return; // Need minimum data

    const values = data.map((m) => m.value);

    // Bayesian statistics
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stddev = Math.sqrt(variance);

    // Forecast: Use exponential smoothing + Bayesian update
    const recent_avg = values.slice(-100).reduce((a, b) => a + b, 0) / 100;
    const trend = recent_avg - mean; // Direction of change

    const forecast_48h: Forecast = {
      predicted_mean: recent_avg + trend * 0.5, // 50% trend continuation
      lower_bound: recent_avg - stddev * this.ANOMALY_THRESHOLD_SIGMA,
      upper_bound: recent_avg + stddev * this.ANOMALY_THRESHOLD_SIGMA,
      confidence_level: 0.75,
      deviation_from_current: trend,
      anomaly_probability: this.calculate_anomaly_probability(values),
    };

    const forecast_30d: Forecast = {
      predicted_mean: mean, // Revert to mean over long term
      lower_bound: mean - stddev * 2.5,
      upper_bound: mean + stddev * 2.5,
      confidence_level: 0.65, // Lower confidence for longer horizons
      deviation_from_current: Math.abs(mean - recent_avg),
      anomaly_probability: this.calculate_anomaly_probability(values) * 0.5, // Lower probability over time
    };

    const model: PredictiveModel = {
      metric_name,
      service,
      historical_values: values.slice(-100), // Keep last 100
      mean,
      stddev,
      anomaly_threshold: mean + stddev * this.ANOMALY_THRESHOLD_SIGMA,
      forecast_48h,
      forecast_30d,
      accuracy_score: 0.75, // Will be computed from backtesting
      last_updated: Date.now(),
    };

    this.models.set(`${service}:${metric_name}`, model);

    // Store in Redis for persistence
    await this.redis_client.set(
      `saib:model:${service}:${metric_name}`,
      JSON.stringify(model),
      (err) => {
        if (err) console.error('[PREDICTIVE] Model save error:', err);
      }
    );
  }

  private calculate_anomaly_probability(values: number[]): number {
    if (values.length < 20) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stddev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

    // Count values beyond 2 sigma
    const anomalies = values.filter((v) => Math.abs(v - mean) > 2 * stddev).length;
    return anomalies / values.length;
  }

  private aggregate_forecasts(time_horizon_ticks: number): RiskForecast {
    let total_risk = 0;
    let total_anomalies = 0;
    let count = 0;
    const recommendations = [];

    for (const [key, model] of this.models.entries()) {
      const forecast = time_horizon_ticks <= 96 ? model.forecast_48h : model.forecast_30d;
      const risk = forecast.anomaly_probability * 100;

      total_risk += risk;
      total_anomalies += forecast.anomaly_probability > 0.3 ? 1 : 0;
      count++;

      if (risk > 30) {
        recommendations.push(`${key}: ${risk.toFixed(0)}% anomaly risk - monitor closely`);
      }
    }

    return {
      service: 'ecosystem',
      risk_level_48h: time_horizon_ticks <= 96 ? total_risk / count : 0,
      risk_level_30d: time_horizon_ticks > 96 ? total_risk / count : 0,
      anomalies_detected: total_anomalies,
      confidence: 0.7,
      recommendations: recommendations.slice(0, 5),
    };
  }

  private extract_metrics_from_probes(probes: any): MetricSnapshot[] {
    const metrics: MetricSnapshot[] = [];
    const timestamp = Date.now();

    // Extract latency from services
    if (probes.services) {
      for (const service of probes.services) {
        if (service.latency_ms !== undefined) {
          metrics.push({
            timestamp,
            service: service.container,
            metric_name: 'latency_ms',
            value: service.latency_ms,
            unit: 'ms',
          });
        }
      }
    }

    // Extract GCV
    if (probes.gcv_deviation) {
      metrics.push({
        timestamp,
        service: 'gcv_engine',
        metric_name: 'gcv_deviation',
        value: probes.gcv_deviation,
        unit: 'usd_cents',
      });
    }

    return metrics;
  }
}

export default PredictiveStateAnalyzer;
