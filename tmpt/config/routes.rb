Rails.application.routes.draw do
  # Root
  root "home#index"
  
  # Pages
  get "home", to: "home#index"
  
  # API Routes for Pi Network
  namespace :api do
    namespace :v1 do
      # Pi Network payment endpoints
      post "/payments", to: "payments#create"
      get "/payments/:id", to: "payments#show"
      get "/payments", to: "payments#index"
      
      # Transaction status
      get "/transactions/:transaction_id/status", to: "transactions#status"
      
      # Pi SDK integration
      post "/pi/payment-complete", to: "pi#payment_complete"
      post "/pi/payment-cancelled", to: "pi#payment_cancelled"
    end
  end
  
  # Health check
  get "health", to: "health#check"
end
