# Deployment Test - Workflow Fix

This file tests that only the subdirectory workflows run, not the root unified workflow.

**Expected behavior:**
- ✅ This file triggers the Rails workflow (in tmpt/ directory)
- ✅ Rails workflow should deploy to Heroku
- ❌ Unified workflow should NOT run (disabled)

Test timestamp: 2026-01-10
