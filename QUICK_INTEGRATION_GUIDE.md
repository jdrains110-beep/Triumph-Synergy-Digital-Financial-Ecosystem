# SAIB v5.0 + v10: Quick Integration Guide

**Get everything wired in 30 minutes**

---

## Step 1: Deploy Supabase Schema (5 min)

```bash
# SSH into your deployment
ssh ubuntu@your-server

# Navigate to project
cd /Users/jeremiahjoeldrains/Desktop/Triumph-Synergy-Digital-Financial-Ecosystem-main

# Run migrations
npx supabase migration up

# Verify tables created
npx supabase db show
```

Expected output:
```
✅ saib_mutation_ledger
✅ governance_proposals
✅ governance_votes
✅ saib_versions
```

---

## Step 2: Update Environment Variables (3 min)

Copy to `.env.local` or CI/CD secrets:

```bash
# Supabase (v5.0 persistent memory)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=YOUR_ANON_KEY

# Redis (hot cache)
REDIS_URL=redis://triumph-redis:6379

# OpenAI (embeddings for pattern matching)
OPENAI_API_KEY=sk_YOUR_KEY

# GitHub (v10 meta-builder)
GITHUB_TOKEN=ghp_YOUR_TOKEN

# AWS (v10 version snapshots)
AWS_ACCESS_KEY_ID=YOUR_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET
AWS_S3_BUCKET=triumph-version-backups
```

---

## Step 3: Wire v5 Orchestrator into Existing Tick (10 min)

**File**: [lib/ecosystem/autonomous-tick.ts](lib/ecosystem/autonomous-tick.ts)

Add these lines at top:
```typescript
import SAIBv5Orchestrator from '@/lib/saib/v5-orchestrator';
import PredictiveStateAnalyzer from '@/lib/saib/predictive-state-machine';
import PersistentMemory from '@/lib/saib/persistent-memory';
import AutonomousExecutor from '@/lib/saib/autonomous-executor';
import QuantumBuilder from '@/lib/saib/quantum-builder';
```

Replace tick function:
```typescript
export async function autonomousTickLoop() {
  // Initialize v5 components
  const predictor = new PredictiveStateAnalyzer();
  const memory = new PersistentMemory();
  const builder = new QuantumBuilder();
  const executor = new AutonomousExecutor(memory, builder);
  const orchestrator = new SAIBv5Orchestrator(predictor, memory, executor, builder);

  // Run orchestrator
  const probes = await probe_all_services();
  const result = await orchestrator.run_30s_loop(probes);

  // Return with v5 data
  return {
    loop_running: true,
    v5: {
      forecast_48h: result.forecast.forecast_48h,
      forecast_30d: result.forecast.forecast_30d,
      diagnosis: result.diagnosis,
      execution: result.execution,
      autonomous_rate: result.autonomous_decision_rate,
    },
    services: probes,
    timestamp: Date.now(),
  };
}
```

---

## Step 4: Update API Response (5 min)

**File**: [app/api/ecosystem/tick/route.ts](app/api/ecosystem/tick/route.ts)

```typescript
export async function GET(request: NextRequest) {
  const tick = await autonomousTickLoop();

  return NextResponse.json({
    loop_running: tick.loop_running,
    tick: {
      timestamp: tick.timestamp,
      // v5 data
      forecast_48h: tick.v5.forecast_48h,
      forecast_30d: tick.v5.forecast_30d,
      diagnosis: tick.v5.diagnosis,
      execution: tick.v5.execution,
      autonomous_decision_rate: tick.v5.autonomous_rate,
      // legacy data
      services: tick.services,
    },
  });
}
```

---

## Step 5: Run Tests (5 min)

```bash
# Run v5 test suite
npm run test:saib-v5

# Expected output:
# ✓ orchestrator.test.ts (6 tests)
# ✓ executor.test.ts (6 tests)
# ✓ integration.test.ts (12 tests)
# ✅ 24 tests passed in 2.3s
```

---

## Step 6: Test In Browser (2 min)

```bash
npm run dev

# Visit:
curl http://localhost:3000/api/ecosystem/tick | jq .tick
```

Expected response:
```json
{
  "forecast_48h": {
    "service": "ecosystem",
    "risk_level_48h": 25,
    "recommendations": [...]
  },
  "execution": {
    "status": "applied",
    "applied_by": "autonomous_executor",
    "risk_score": 0.28
  },
  "autonomous_decision_rate": 0.82
}
```

---

## Step 7: Monitor Dashboard

Open your browser:
```
http://localhost:3000/api/ecosystem/tick
```

Watch real-time:
- ✅ Forecast accuracy
- ✅ Autonomous decision rate
- ✅ Mutation outcomes
- ✅ GCV peg status

---

## 🎯 Validation Checklist

- [ ] Supabase tables created
- [ ] Environment variables set
- [ ] v5-orchestrator imported into autonomous-tick
- [ ] Tests passing (24/24)
- [ ] API response includes forecast + execution
- [ ] Dashboard showing real data
- [ ] Zero console errors

---

## 🚨 Troubleshooting

**Problem**: `Cannot find module '@/lib/saib/v5-orchestrator'`
```bash
# Solution: Verify file exists
ls -la lib/saib/
# Should show: v5-orchestrator.ts, orchestrator.ts, etc.
```

**Problem**: `Supabase connection failed`
```bash
# Solution: Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_KEY

# If empty, update .env.local
```

**Problem**: `Tests failing: "Cannot find QuantumBuilder"`
```bash
# Solution: Import QuantumBuilder at top of tests
import { QuantumBuilder } from '@/lib/saib/quantum-builder';
```

---

## ✅ You're Live!

Once all steps complete:

1. **v5.0 running**: Autonomous decision rate >80%
2. **Mutations recorded**: 100+ in Supabase within 24h
3. **GCV enforced**: Peg within $100
4. **Deeds issued**: 10+ daily from orchestrator actions
5. **Uptime**: 99.95%+ during pilot

---

## 📞 Next: Merchant Pilot Setup

Once v5.0 is stable, onboard merchants:

```bash
# Generate API key for merchant
npm run script:create-merchant-key -- --email merchant@example.com

# Output:
# 🔑 API Key: pk_live_a1b2c3d4e5f6g7h8
# 📊 Dashboard: https://dashboard.triumph.app/merchants/pk_live_...
# 💰 Pre-funded: $1000 TRISYN for testing
```

Merchant integration (1 line of code):

```typescript
import { TriumphSDK } from '@triumph/saib-v10-sdk';

const saib = new TriumphSDK({ api_key: 'pk_live_...' });

// Process payment
await saib.process_payment({
  amount_pi: 10,
  recipient_pi_address: '...',
  merchant_id: 'my_store',
});
```

---

**⏱ Total Integration Time: 30 minutes**  
**🎉 Status: v5.0 + v10 Production Ready**

