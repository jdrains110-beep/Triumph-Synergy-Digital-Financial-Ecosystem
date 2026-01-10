require_relative "boot"

require "rails/all"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module PiNetworkRails
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.0

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `plugins`.
    # config.autoload_lib(ignore: %w(assets tasks))

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be configured before a request is processed. Rack
    # middleware near the top of the stack take precedence in being called
    # when a request is processed.
    #
    # config.middleware.use Rack::MethodOverride
    # config.middleware.use MyCustomMiddleware

    # Middleware for CORS
    config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins '*'
        resource '*', headers: :any, methods: [:get, :post, :put, :patch, :delete]
      end
    end

    # Only loads a smaller set of middleware suitable for API only apps.
    # Disable views, helpers and assets generation for API mode.
    # config.api_only = true
  end
end
