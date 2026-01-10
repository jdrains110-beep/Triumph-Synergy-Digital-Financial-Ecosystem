class HealthController < ApplicationController
  def check
    render json: {
      status: "ok",
      service: "Triumph-Synergy Pi Network Payment API",
      version: "1.0.0",
      pi_sdk: "integrated",
      timestamp: Time.current
    }
  end
end
