-- =============================================================================
-- user_roles — RBAC role assignments for Triumph Synergy IAM
-- =============================================================================
-- Stores the mapping between Supabase auth users and RBAC roles defined in
-- lib/security/iam.ts.  A user may hold more than one role simultaneously.
--
-- Row-level security:
--   SELECT  — users can read their own role rows (needed by client-side
--             hasPermission checks); service-role bypasses RLS.
--   INSERT/UPDATE/DELETE — service-role only (RLS-bypassed).  No policy is
--             created for these verbs, so direct client writes are blocked.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_roles (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    role        text        NOT NULL,
    granted_by  uuid        REFERENCES auth.users (id) ON DELETE SET NULL,
    granted_at  timestamptz DEFAULT now() NOT NULL,

    CONSTRAINT user_roles_role_check CHECK (
        role IN (
            'superadmin',
            'admin',
            'merchant',
            'support',
            'marketing',
            'finance',
            'developer',
            'analyst',
            'customer'
        )
    ),

    -- One row per (user, role) pair
    UNIQUE (user_id, role)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own role assignments
CREATE POLICY "user_roles_select_own"
    ON user_roles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Service-role connections (SUPABASE_SERVICE_ROLE_KEY) bypass RLS, so no
-- additional INSERT/UPDATE/DELETE policies are needed for admin operations.

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);

COMMENT ON TABLE user_roles IS
    'RBAC role assignments.  '
    'Service-role writes bypass RLS.  '
    'Users can read their own roles via the select_own policy.';
COMMENT ON COLUMN user_roles.user_id    IS 'Supabase auth.users primary key.';
COMMENT ON COLUMN user_roles.role       IS 'Must match a key in iamConfig.authorization.roles.';
COMMENT ON COLUMN user_roles.granted_by IS 'Admin user who assigned the role, NULL if system-assigned.';
