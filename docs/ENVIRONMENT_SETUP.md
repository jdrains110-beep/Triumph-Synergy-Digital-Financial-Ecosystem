# Environment Variables Configuration Guide

## 🔐 Required Environment Variables

This document lists all environment variables needed for Triumph Synergy to run in production.

## Core Application

```bash
# Node Environment
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Application URL
NEXTAUTH_URL=https://triumph-synergy.com
NEXTAUTH_SECRET=<generate_with_openssl_rand_-base64_32>

# Auth Secret
AUTH_SECRET=<generate_with_openssl_rand_-base64_32>
```

## Database & Cache

```bash
# PostgreSQL - Primary Database
POSTGRES_URL=postgresql://user:password@host:5432/triumph_synergy
SUPABASE_DB_URL=postgresql://user:password@host:5432/triumph_synergy

# Redis - Cache & Queues
REDIS_URL=redis://host:6379
```

## Supabase

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Pi Network

```bash
# Pi Network API Keys
PI_API_KEY=<your_pi_api_key>
PI_INTERNAL_API_KEY=<your_pi_internal_key>
```

## Stellar Network

```bash
# Stellar Blockchain
STELLAR_HORIZON_URL=https://horizon.stellar.org
# For testnet: https://horizon-testnet.stellar.org
```

## GitHub

```bash
# GitHub OAuth & Webhooks
GITHUB_CLIENT_ID=<your_github_oauth_client_id>
GITHUB_CLIENT_SECRET=<your_github_oauth_client_secret>
GITHUB_WEBHOOK_SECRET=<your_webhook_secret>
```

## Google Cloud Platform (Primary)

```bash
# GCP Project
GCP_PROJECT_ID=triumph-synergy-prod
GCP_REGION=us-central1

# GCP Service Account (for server-side operations)
GCP_SA_KEY=<base64_encoded_service_account_json>

# Cloud SQL
CLOUDSQL_CONNECTION_NAME=project:region:instance

# Cloud Storage
GCS_BUCKET=triumph-synergy-assets
```

## Amazon Web Services (Backup)

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=<your_aws_access_key>
AWS_SECRET_ACCESS_KEY=<your_aws_secret_key>
AWS_REGION=us-east-1

# S3
S3_BUCKET=triumph-synergy-backup
```

## OAuth Providers

```bash
# Google OAuth
GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>

# Microsoft OAuth
MICROSOFT_CLIENT_ID=<your_microsoft_client_id>
MICROSOFT_CLIENT_SECRET=<your_microsoft_client_secret>

# Apple OAuth
APPLE_CLIENT_ID=<your_apple_client_id>
APPLE_TEAM_ID=<your_apple_team_id>
APPLE_KEY_ID=<your_apple_key_id>
APPLE_PRIVATE_KEY=<your_apple_private_key>
```

## Payment Gateways

```bash
# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# PayPal
PAYPAL_CLIENT_ID=<your_paypal_client_id>
PAYPAL_CLIENT_SECRET=<your_paypal_client_secret>
```

## Shipping & Logistics

```bash
# Shippo
SHIPPO_API_KEY=<your_shippo_api_key>

# UPS
UPS_CLIENT_ID=<your_ups_client_id>
UPS_CLIENT_SECRET=<your_ups_client_secret>

# FedEx
FEDEX_API_KEY=<your_fedex_api_key>
FEDEX_SECRET_KEY=<your_fedex_secret>
```

## Marketing & Communication

```bash
# SendGrid (Email)
SENDGRID_API_KEY=SG.xxxxx

# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=<your_firebase_project>
FIREBASE_CLIENT_EMAIL=<your_firebase_email>
FIREBASE_PRIVATE_KEY=<your_firebase_private_key>
```

## CRM & Support

```bash
# Salesforce
SALESFORCE_CLIENT_ID=<your_salesforce_client_id>
SALESFORCE_CLIENT_SECRET=<your_salesforce_client_secret>
SALESFORCE_INSTANCE_URL=https://your-instance.salesforce.com

# Zendesk
ZENDESK_SUBDOMAIN=<your_subdomain>
ZENDESK_USERNAME=<your_zendesk_username>
ZENDESK_TOKEN=<your_zendesk_token>
```

## Analytics

```bash
# Segment
SEGMENT_WRITE_KEY=<your_segment_write_key>

# Google Analytics
GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Security & Monitoring

```bash
# Sentry (Error Tracking)
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Cloudflare (DDoS Protection)
CLOUDFLARE_API_TOKEN=<your_cloudflare_token>

# Snyk (Security Scanning)
SNYK_TOKEN=<your_snyk_token>
```

## Optional Features

```bash
# Feature Flags
ENABLE_BETA_FEATURES=false
ENABLE_MAINTENANCE_MODE=false

# Rate Limiting
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=3600

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# CORS
ALLOWED_ORIGINS=https://triumph-synergy.com,https://www.triumph-synergy.com
```

---

## 🚀 Setting Up Environment Variables

### Local Development (.env.local)

1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in all required variables

3. Never commit `.env.local` to version control

### Vercel Deployment

1. Via Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add each variable individually
   - Set scope (Production, Preview, Development)

2. Via Vercel CLI:
   ```bash
   vercel env add VARIABLE_NAME production
   ```

3. Via API:
   ```bash
   curl -X POST "https://api.vercel.com/v9/projects/$PROJECT_ID/env" \
     -H "Authorization: Bearer $VERCEL_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"key":"VARIABLE_NAME","value":"value","type":"encrypted","target":["production"]}'
   ```

### Docker Compose

1. Create `.env` file in project root:
   ```bash
   cp .env.example .env
   ```

2. Fill in all required variables

3. Docker Compose will automatically load from `.env`

### Kubernetes (GKE/EKS)

1. Create Kubernetes secret:
   ```bash
   kubectl create secret generic triumph-secrets \
     --from-literal=POSTGRES_URL=postgresql://... \
     --from-literal=REDIS_URL=redis://... \
     --from-literal=AUTH_SECRET=... \
     -n triumph-synergy
   ```

2. Or use a secret file:
   ```bash
   kubectl apply -f infrastructure/kubernetes/secrets.yaml
   ```

3. Reference in deployment:
   ```yaml
   envFrom:
   - secretRef:
       name: triumph-secrets
   ```

### Google Cloud Secret Manager

1. Store secrets:
   ```bash
   echo -n "secret-value" | gcloud secrets create SECRET_NAME --data-file=-
   ```

2. Grant access:
   ```bash
   gcloud secrets add-iam-policy-binding SECRET_NAME \
     --member="serviceAccount:SERVICE_ACCOUNT" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. Access in code:
   ```typescript
   import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
   const client = new SecretManagerServiceClient();
   const [version] = await client.accessSecretVersion({ name: 'projects/PROJECT_ID/secrets/SECRET_NAME/versions/latest' });
   ```

### AWS Secrets Manager

1. Store secrets:
   ```bash
   aws secretsmanager create-secret \
     --name triumph-synergy/production \
     --secret-string '{"POSTGRES_URL":"postgresql://..."}'
   ```

2. Access in code:
   ```typescript
   import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
   const client = new SecretsManagerClient({ region: "us-east-1" });
   const response = await client.send(new GetSecretValueCommand({ SecretId: "triumph-synergy/production" }));
   ```

---

## 🔒 Security Best Practices

1. **Never commit secrets** to version control
   - Add `.env*` to `.gitignore`
   - Use `.env.example` for documentation only

2. **Use strong secrets**
   - Generate with: `openssl rand -base64 32`
   - Minimum 32 characters

3. **Rotate secrets regularly**
   - Database passwords: Every 90 days
   - API keys: Every 90 days
   - Auth secrets: Every 365 days

4. **Use different secrets per environment**
   - Development
   - Staging
   - Production

5. **Limit access**
   - Use service accounts with minimal permissions
   - Enable audit logging
   - Use secret management services (GCP Secret Manager, AWS Secrets Manager)

6. **Monitor for leaks**
   - Enable GitHub secret scanning
   - Use tools like `git-secrets` or `truffleHog`
   - Set up alerts for unauthorized access

---

## 📋 Checklist

Before deploying to production, ensure:

- [ ] All required environment variables are set
- [ ] Secrets are strong (32+ characters)
- [ ] Different secrets for each environment
- [ ] Database URLs point to production instances
- [ ] OAuth redirect URLs are configured
- [ ] Webhook endpoints are publicly accessible
- [ ] API keys have appropriate rate limits
- [ ] Service accounts have minimal permissions
- [ ] Secrets are stored in secret manager (not in code)
- [ ] Monitoring and alerting are enabled
- [ ] Backup credentials are tested
- [ ] SSL/TLS certificates are valid

---

## 🆘 Troubleshooting

### "Cannot connect to database"
- Verify `POSTGRES_URL` format: `postgresql://user:password@host:5432/database`
- Check database host is accessible
- Verify credentials are correct
- Ensure database exists

### "Redis connection failed"
- Verify `REDIS_URL` format: `redis://host:6379`
- Check Redis host is accessible
- Verify Redis is running

### "Invalid AUTH_SECRET"
- Regenerate with: `openssl rand -base64 32`
- Ensure it's set in all environments

### "OAuth redirect mismatch"
- Verify redirect URLs in OAuth provider settings
- Format: `https://yourdomain.com/api/auth/callback/provider`

### "Webhook signature verification failed"
- Verify webhook secret matches provider configuration
- Check webhook endpoint is publicly accessible
- Ensure HTTPS is enabled

---

For more help, contact: support@triumph-synergy.com
