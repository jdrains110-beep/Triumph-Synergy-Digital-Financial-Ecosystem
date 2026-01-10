# Pi Network SDK Configuration

PI_NETWORK_CONFIG = {
  app_id: ENV.fetch("PI_APP_ID", "triumph-synergy-entertainment"),
  sdk_version: "2.0",
  sdk_url: "https://sdk.minepi.com/pi-sdk.js",
  api_base_url: ENV.fetch("PI_API_URL", "http://localhost:3000"),
  
  # Payment settings
  payment: {
    amount_min: 0.01,
    amount_max: 1_000_000,
    currency: "Pi"
  },
  
  # Environment
  environment: Rails.env.production? ? "production" : "development",
  
  # Security
  require_auth_token: true,
  validate_signature: true
}

Rails.logger.info "Pi Network SDK initialized: #{PI_NETWORK_CONFIG.inspect}"
