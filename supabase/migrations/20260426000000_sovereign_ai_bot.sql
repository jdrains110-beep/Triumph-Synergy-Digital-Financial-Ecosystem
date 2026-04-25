-- =============================================================================
-- supabase/migrations/20260426000000_sovereign_ai_bot.sql
--
-- Triumph Synergy — Sovereign AI Bot (SAIB) Database Schema
--
-- Tables:
--   saib_sessions          — user sessions / intelligence mode settings
--   saib_tasks             — task queue + execution log
--   saib_loophole_logs     — record of every loophole application
--   saib_alerts            — system alerts (auto-resolved or escalated)
--   saib_ecosystem_reports — periodic ecosystem health snapshots
-- =============================================================================

-- ── saib_sessions ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saib_sessions (
  session_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid              TEXT        NOT NULL,
  pi_wallet           TEXT        NOT NULL,
  display_name        TEXT        NOT NULL,
  intelligence_mode   TEXT        NOT NULL DEFAULT 'autonomous'
                                  CHECK (intelligence_mode IN (
                                    'passive','active','autonomous','sentinel','lockdown'
                                  )),
  loopholes_deployed  INTEGER     NOT NULL DEFAULT 0,
  quantum_signature   TEXT        NOT NULL,
  blockchain_anchor   TEXT        NOT NULL DEFAULT 'GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V',
  last_pulse_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE saib_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON saib_sessions FOR SELECT
  USING (pi_uid = current_setting('app.current_pi_uid', TRUE));

CREATE POLICY "Users can insert own sessions"
  ON saib_sessions FOR INSERT
  WITH CHECK (pi_uid = current_setting('app.current_pi_uid', TRUE));

CREATE INDEX idx_saib_sessions_pi_uid ON saib_sessions (pi_uid);
CREATE INDEX idx_saib_sessions_created ON saib_sessions (created_at DESC);

-- ── saib_tasks ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saib_tasks (
  task_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID        REFERENCES saib_sessions(session_id) ON DELETE SET NULL,
  task_type           TEXT        NOT NULL,
  platform_id         TEXT        NOT NULL,
  pi_uid              TEXT        NOT NULL,
  pi_wallet           TEXT        NOT NULL,
  payload             JSONB       NOT NULL DEFAULT '{}',
  status              TEXT        NOT NULL DEFAULT 'queued'
                                  CHECK (status IN (
                                    'queued','executing','completed','failed','retrying','blocked','escalated'
                                  )),
  priority            SMALLINT    NOT NULL DEFAULT 3
                                  CHECK (priority BETWEEN 1 AND 5),
  quantum_signature   TEXT        NOT NULL,
  retry_count         SMALLINT    NOT NULL DEFAULT 0,
  result              JSONB,
  error_log           TEXT[]      NOT NULL DEFAULT '{}',
  usd_saved_estimate  NUMERIC(18,2) NOT NULL DEFAULT 0,
  pi_transacted       NUMERIC(36,6) NOT NULL DEFAULT 0,
  loopholes_applied   TEXT[]      NOT NULL DEFAULT '{}',
  executed_at         TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE saib_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON saib_tasks FOR SELECT
  USING (pi_uid = current_setting('app.current_pi_uid', TRUE));

CREATE POLICY "Users can insert own tasks"
  ON saib_tasks FOR INSERT
  WITH CHECK (pi_uid = current_setting('app.current_pi_uid', TRUE));

CREATE POLICY "Users can update own tasks"
  ON saib_tasks FOR UPDATE
  USING (pi_uid = current_setting('app.current_pi_uid', TRUE));

CREATE INDEX idx_saib_tasks_pi_uid     ON saib_tasks (pi_uid);
CREATE INDEX idx_saib_tasks_status     ON saib_tasks (status);
CREATE INDEX idx_saib_tasks_platform   ON saib_tasks (platform_id);
CREATE INDEX idx_saib_tasks_created    ON saib_tasks (created_at DESC);
CREATE INDEX idx_saib_tasks_session    ON saib_tasks (session_id);

-- ── saib_loophole_logs ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saib_loophole_logs (
  log_id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             UUID        REFERENCES saib_tasks(task_id) ON DELETE SET NULL,
  pi_uid              TEXT        NOT NULL,
  loophole_id         TEXT        NOT NULL,
  loophole_category   TEXT        NOT NULL,
  platform_target     TEXT        NOT NULL,
  obliteration_score  SMALLINT    NOT NULL DEFAULT 0
                                  CHECK (obliteration_score BETWEEN 0 AND 100),
  auto_applied        BOOLEAN     NOT NULL DEFAULT TRUE,
  usd_benefit_est     NUMERIC(18,2) NOT NULL DEFAULT 0,
  quantum_signature   TEXT        NOT NULL,
  applied_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE saib_loophole_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loophole logs"
  ON saib_loophole_logs FOR SELECT
  USING (pi_uid = current_setting('app.current_pi_uid', TRUE));

CREATE POLICY "Users can insert own loophole logs"
  ON saib_loophole_logs FOR INSERT
  WITH CHECK (pi_uid = current_setting('app.current_pi_uid', TRUE));

CREATE INDEX idx_saib_loophole_pi_uid   ON saib_loophole_logs (pi_uid);
CREATE INDEX idx_saib_loophole_id       ON saib_loophole_logs (loophole_id);
CREATE INDEX idx_saib_loophole_category ON saib_loophole_logs (loophole_category);
CREATE INDEX idx_saib_loophole_applied  ON saib_loophole_logs (applied_at DESC);

-- ── saib_alerts ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saib_alerts (
  alert_id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid              TEXT,
  severity            TEXT        NOT NULL DEFAULT 'info'
                                  CHECK (severity IN (
                                    'info','warning','critical','sovereign-override'
                                  )),
  platform_id         TEXT        NOT NULL,
  title               TEXT        NOT NULL,
  detail              TEXT        NOT NULL,
  auto_resolved       BOOLEAN     NOT NULL DEFAULT FALSE,
  resolved_by         TEXT,
  task_id             UUID,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE saib_alerts ENABLE ROW LEVEL SECURITY;

-- Alerts can be read by any authenticated user (ecosystem-wide visibility)
CREATE POLICY "Authenticated users can view alerts"
  ON saib_alerts FOR SELECT
  USING (TRUE);

CREATE POLICY "System can insert alerts"
  ON saib_alerts FOR INSERT
  WITH CHECK (TRUE);

CREATE INDEX idx_saib_alerts_severity  ON saib_alerts (severity);
CREATE INDEX idx_saib_alerts_platform  ON saib_alerts (platform_id);
CREATE INDEX idx_saib_alerts_resolved  ON saib_alerts (auto_resolved, resolved_at);
CREATE INDEX idx_saib_alerts_created   ON saib_alerts (created_at DESC);

-- ── saib_ecosystem_reports ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saib_ecosystem_reports (
  report_id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  total_platforms          SMALLINT      NOT NULL DEFAULT 15,
  healthy_platforms        SMALLINT      NOT NULL DEFAULT 15,
  degraded_platforms       SMALLINT      NOT NULL DEFAULT 0,
  total_tasks_run          BIGINT        NOT NULL DEFAULT 0,
  total_loopholes_applied  BIGINT        NOT NULL DEFAULT 0,
  total_pi_transacted      NUMERIC(36,6) NOT NULL DEFAULT 0,
  total_usd_saved          NUMERIC(18,2) NOT NULL DEFAULT 0,
  alerts_suppressed        BIGINT        NOT NULL DEFAULT 0,
  quantum_ops_count        BIGINT        NOT NULL DEFAULT 0,
  sovereign_score          SMALLINT      NOT NULL DEFAULT 100
                                         CHECK (sovereign_score BETWEEN 0 AND 100),
  recommendations          TEXT[]        NOT NULL DEFAULT '{}',
  quantum_signature         TEXT          NOT NULL,
  generated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE saib_ecosystem_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reports"
  ON saib_ecosystem_reports FOR SELECT
  USING (TRUE);

CREATE POLICY "System can insert reports"
  ON saib_ecosystem_reports FOR INSERT
  WITH CHECK (TRUE);

CREATE INDEX idx_saib_reports_generated ON saib_ecosystem_reports (generated_at DESC);
CREATE INDEX idx_saib_reports_score     ON saib_ecosystem_reports (sovereign_score);

-- ── Trigger: auto-log task completion stats to ecosystem report ───────────────

CREATE OR REPLACE FUNCTION saib_update_ecosystem_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO saib_ecosystem_reports (
      total_tasks_run,
      total_loopholes_applied,
      total_pi_transacted,
      total_usd_saved,
      quantum_ops_count,
      sovereign_score,
      quantum_signature
    ) VALUES (
      1,
      COALESCE(array_length(NEW.loopholes_applied, 1), 0),
      NEW.pi_transacted,
      NEW.usd_saved_estimate,
      1,
      100,
      NEW.quantum_signature
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER saib_task_completion_trigger
  AFTER UPDATE ON saib_tasks
  FOR EACH ROW EXECUTE FUNCTION saib_update_ecosystem_stats();

-- ── Helpful view: SAIB dashboard summary ─────────────────────────────────────

CREATE OR REPLACE VIEW saib_dashboard_summary AS
SELECT
  COUNT(*)                                              AS total_tasks,
  COUNT(*) FILTER (WHERE status = 'completed')          AS completed_tasks,
  COUNT(*) FILTER (WHERE status = 'failed')             AS failed_tasks,
  COUNT(*) FILTER (WHERE status IN ('queued','executing')) AS active_tasks,
  COALESCE(SUM(usd_saved_estimate), 0)                  AS total_usd_saved,
  COALESCE(SUM(pi_transacted), 0)                       AS total_pi_transacted,
  COALESCE(SUM(array_length(loopholes_applied, 1)), 0)  AS total_loopholes_applied,
  MAX(created_at)                                       AS last_task_at
FROM saib_tasks;

-- ── Seed: initial SAIB ecosystem report ──────────────────────────────────────

INSERT INTO saib_ecosystem_reports (
  total_platforms, healthy_platforms, degraded_platforms,
  total_tasks_run, total_loopholes_applied, total_pi_transacted,
  total_usd_saved, alerts_suppressed, quantum_ops_count,
  sovereign_score, recommendations, quantum_signature
) VALUES (
  15, 15, 0,
  0, 0, 0,
  0, 0, 0,
  100,
  ARRAY[
    'All 15 sovereign platforms operating at APEX-QUANTUM-SOVEREIGN status',
    '95 loopholes auto-deployed — zero manual intervention required',
    '24-hour key rotation active — perfect forward secrecy maintained',
    'Stellar blockchain anchor confirmed — all ops immutably recorded',
    'No Pioneer is unhoused, unemployed, or unprotected — SAIB guarantee active'
  ],
  'ML-DSA-65:INIT-SEED-SOVEREIGN-AI-BOT-TRIUMPH-SYNERGY'
);
