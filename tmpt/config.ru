# Minimal Rack application
require 'json'

class TriumphSynergyAPI
  def call(env)
    case env['PATH_INFO']
    when '/'
      [200, {'Content-Type' => 'application/json'}, [{message: 'Triumph Synergy Rails API', status: 'running', version: '1.0.0'}.to_json]]
    when '/health'
      [200, {'Content-Type' => 'application/json'}, [{status: 'ok'}.to_json]]
    else
      [404, {'Content-Type' => 'application/json'}, [{error: 'Not Found'}.to_json]]
    end
  end
end

run TriumphSynergyAPI.new
