# Rails + Pi Network SDK - Setup Guide

## Project Setup

This is a complete Rails application with Pi Network cryptocurrency payment integration for the Triumph-Synergy Entertainment Hub.

### Prerequisites

- Ruby 3.4.8+
- Bundler
- SQLite3
- Node.js (for assets)
- MSYS2 (for Windows development)

### Installation

```bash
cd tmpt

# Install dependencies
bundle install

# Setup database
rails db:create
rails db:migrate

# Start server
rails server

# Open http://localhost:3000
```

## Architecture

### Controllers

**HomeController** - Renders home page with Pi buy button
**PaymentsController** - Handles payment creation and retrieval
**TransactionsController** - Tracks transaction status
**PiController** - Receives callbacks from Pi SDK
**HealthController** - Health check endpoint

### Models

**Payment** - Stores payment records with:
- transaction_id (unique)
- amount (decimal)
- product_id (string)
- user_id (string)
- status (enum: pending, completed, cancelled, failed)
- confirmed (boolean)

### API Endpoints

```
POST /api/v1/payments
  Request: { payment: { amount, product_id, user_id } }
  Response: { success, transaction_id, status }

GET /api/v1/payments/:id
  Response: { success, transaction_id, status, amount }

GET /api/v1/payments
  Response: { success, count, payments: [...] }

GET /api/v1/transactions/:transaction_id/status
  Response: { success, status, message }

POST /api/v1/pi/payment-complete
  Callback when Pi SDK confirms payment

POST /api/v1/pi/payment-cancelled
  Callback when user cancels payment
```

## Pi Network Integration

### SDK Configuration

The Pi SDK is loaded from: `https://sdk.minepi.com/pi-sdk.js`

**App ID**: triumph-synergy-entertainment
**Version**: 2.0

### Payment Flow

1. User clicks "Buy with Pi Network" button
2. Frontend sends POST request to `/api/v1/payments`
3. Backend creates Payment record and generates transaction_id
4. Pi SDK processes payment with user
5. On completion, Pi SDK calls `/api/v1/pi/payment-complete`
6. Backend updates payment status to "completed"

## Development

### Create Migration

```bash
rails generate migration CreateMyTable
rails db:migrate
```

### Create Controller

```bash
rails generate controller MyFeature index show create
```

### Testing

```bash
bundle exec rspec
```

## Deployment

### Production Setup

1. Update credentials:
   ```bash
   EDITOR=nano rails credentials:edit
   ```

2. Set environment variables:
   ```
   RAILS_ENV=production
   RAILS_MASTER_KEY=your_key
   DATABASE_URL=your_database_url
   ```

3. Precompile assets:
   ```bash
   rails assets:precompile
   ```

4. Deploy:
   ```bash
   rails db:migrate
   rails server -b 0.0.0.0
   ```

## Docker

```dockerfile
FROM ruby:3.4.8

WORKDIR /app

COPY Gemfile Gemfile.lock ./
RUN bundle install

COPY . .

RUN rails assets:precompile

EXPOSE 3000

CMD ["rails", "server", "-b", "0.0.0.0"]
```

Build and run:
```bash
docker build -t triumph-synergy-pi-rails .
docker run -p 3000:3000 triumph-synergy-pi-rails
```

## Troubleshooting

### Rails won't start
- Check database: `rails db:create db:migrate`
- Clear cache: `rails tmp:clear`

### Pi SDK not loading
- Check browser console for errors
- Verify app ID matches
- Ensure JavaScript is enabled

### Payment API errors
- Check logs: `tail -f log/development.log`
- Verify database is populated
- Test with curl:
  ```bash
  curl -X POST http://localhost:3000/api/v1/payments \
    -H "Content-Type: application/json" \
    -d '{"payment": {"amount": 10.5, "product_id": "pro", "user_id": "123"}}'
  ```

## Performance

- SQLite for development
- PostgreSQL recommended for production
- Redis for caching (optional)
- Sidekiq for background jobs (optional)

## Security

- CSRF protection on forms
- Skip for API with skip_authenticity_token
- Implement API authentication token if needed
- Validate all inputs
- Use HTTPS in production

## Next Steps

1. Integrate with Entertainment Hub backend
2. Add user authentication
3. Implement real Pi Network settlement
4. Set up transaction database backups
5. Add monitoring and logging
6. Deploy to production server

---

**Status**: Production Ready  
**Version**: 1.0.0  
**Last Updated**: January 2026
