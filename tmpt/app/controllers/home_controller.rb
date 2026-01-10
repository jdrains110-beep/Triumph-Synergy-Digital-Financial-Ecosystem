class HomeController < ApplicationController
  def index
    @app_title = "Triumph-Synergy Entertainment Hub"
    @pi_app_id = "triumph-synergy-entertainment"
    @payment_amount = 10.50
  end
end
