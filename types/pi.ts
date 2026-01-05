/**
 * Pi Network Type Definitions
 */

export enum PiSource {
  INTERNAL_MINED = "internal_mined",
  INTERNAL_CONTRIBUTED = "internal_contributed",
  EXTERNAL_EXCHANGE = "external_exchange",
}

export interface PiSourceConfig {
  source: PiSource;
  amount: number;
}

export interface PiValue {
  nominal_amount: number;
  internal_value: number;
  price_equivalent: number;
  source: PiSource;
}
