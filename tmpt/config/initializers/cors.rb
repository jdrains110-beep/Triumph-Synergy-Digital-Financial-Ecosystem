# CORS Configuration for Pi Network integration

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # Allow all origins in development
    origins Rails.env.development? ? '*' : ENV.fetch('CORS_ORIGINS', 'localhost:3000').split(',')
    
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options],
      credentials: true
  end
end
