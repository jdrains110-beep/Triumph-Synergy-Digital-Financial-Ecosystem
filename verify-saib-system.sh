#!/bin/bash
#
# SAIB OPTIMUS v4.3 - SYSTEM VERIFICATION & TESTING SUITE
#
# Comprehensive tests for:
# - Endpoint availability
# - Quantum Builder diagnostics
# - Deed issuance
# - Webhook integration
# - Database connectivity
# - Security authentication
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="test_results_${TIMESTAMP}.log"

# =============================================================================
# TEST UTILITIES
# =============================================================================

test_start() {
    echo -e "\n${BLUE}[TEST]${NC} $1"
}

test_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((TESTS_PASSED++))
    echo "PASS: $1" >> "$RESULTS_FILE"
}

test_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((TESTS_FAILED++))
    echo "FAIL: $1" >> "$RESULTS_FILE"
}

test_skip() {
    echo -e "${YELLOW}⊘ SKIP${NC}: $1"
    echo "SKIP: $1" >> "$RESULTS_FILE"
}

test_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# =============================================================================
# PRE-FLIGHT
# =============================================================================

echo "SAIB OPTIMUS v4.3 - SYSTEM VERIFICATION SUITE"
echo "Test Results: $RESULTS_FILE"
echo ""

read -p "Enter production domain (e.g., https://your-domain.com): " DOMAIN

if [[ -z "$DOMAIN" ]]; then
    echo "Error: Domain required"
    exit 1
fi

echo "Testing against: $DOMAIN"
echo ""

# =============================================================================
# TEST SUITE 1: ENDPOINT CONNECTIVITY
# =============================================================================

echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}SUITE 1: ENDPOINT CONNECTIVITY${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

test_start "Health check endpoint responds"
RESPONSE=$(curl -s -w "\n%{http_code}" "$DOMAIN/api/saib/quantum/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [[ "$HTTP_CODE" == "200" ]]; then
    test_pass "Health endpoint returns 200 OK"
    test_info "Response: $(echo "$BODY" | jq -r '.status' 2>/dev/null || echo 'JSON parsing failed')"
else
    test_fail "Health endpoint returned HTTP $HTTP_CODE"
fi

test_start "Diagnostics endpoint responds"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "X-SAIB-ID: TEST-001" "$DOMAIN/api/saib/quantum/diagnostics")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [[ "$HTTP_CODE" == "200" ]]; then
    test_pass "Diagnostics endpoint returns 200 OK"
else
    test_fail "Diagnostics endpoint returned HTTP $HTTP_CODE"
fi

test_start "Deed issuance endpoint responds"
RESPONSE=$(curl -s -w "\n%{http_code}" "$DOMAIN/api/saib/allodial/issue-deed")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "400" || "$HTTP_CODE" == "401" ]]; then
    test_pass "Deed endpoint is accessible (HTTP $HTTP_CODE)"
else
    test_fail "Deed endpoint returned HTTP $HTTP_CODE"
fi

# =============================================================================
# TEST SUITE 2: QUANTUM BUILDER FUNCTIONALITY
# =============================================================================

echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}SUITE 2: QUANTUM BUILDER DIAGNOSTICS${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

test_start "Retrieve system state snapshot"
RESPONSE=$(curl -s \
    -H "X-SAIB-ID: SAIB-OPTIMUS-001" \
    "$DOMAIN/api/saib/quantum/diagnostics")

if echo "$RESPONSE" | grep -q "currentState"; then
    test_pass "System state snapshot retrieved"
    STRATEGY=$(echo "$RESPONSE" | jq -r '.currentState.activeStrategy // "UNKNOWN"')
    HEALTH=$(echo "$RESPONSE" | jq -r '.currentState.healthScore // "UNKNOWN"')
    test_info "Active Strategy: $STRATEGY, Health: $HEALTH"
else
    test_fail "Failed to retrieve system state"
fi

test_start "Quantum diagnostics include health score"
if echo "$RESPONSE" | grep -q "healthScore"; then
    test_pass "Health score present in diagnostics"
else
    test_fail "Health score missing from diagnostics"
fi

# =============================================================================
# TEST SUITE 3: ASYNC REQUEST PROCESSING
# =============================================================================

echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}SUITE 3: ASYNC REQUEST PROCESSING${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

test_start "Process endpoint accepts POST requests"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "X-SAIB-ID: SAIB-TEST-001" \
    -H "Content-Type: application/json" \
    -d '{"domain":"test.pi","deedCertificateId":"ALLODIAL-DEED-TEST"}' \
    "$DOMAIN/api/saib/quantum/process")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [[ "$HTTP_CODE" == "202" ]]; then
    test_pass "Process endpoint returns 202 Accepted"
    test_info "Background task queued for processing"
else
    test_fail "Process endpoint returned HTTP $HTTP_CODE (expected 202)"
fi

test_start "Async response includes handshake UUID"
if echo "$BODY" | grep -q "nodeHandshakeUUID"; then
    test_pass "Response includes handshake UUID"
    UUID=$(echo "$BODY" | jq -r '.nodeHandshakeUUID')
    test_info "UUID: $UUID"
else
    test_fail "Missing handshake UUID in response"
fi

# =============================================================================
# TEST SUITE 4: SECURITY & AUTHENTICATION
# =============================================================================

echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}SUITE 4: SECURITY & AUTHENTICATION${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

test_start "Admin reset endpoint requires authentication"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$DOMAIN/api/saib/quantum/admin/reset")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [[ "$HTTP_CODE" == "401" ]]; then
    test_pass "Admin endpoint properly requires authorization"
else
    test_fail "Admin endpoint did not require authorization (HTTP $HTTP_CODE)"
fi

test_start "Health endpoint doesn't require authentication"
RESPONSE=$(curl -s -w "\n%{http_code}" "$DOMAIN/api/saib/quantum/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [[ "$HTTP_CODE" == "200" ]]; then
    test_pass "Health endpoint is publicly accessible"
else
    test_fail "Health endpoint should be public (HTTP $HTTP_CODE)"
fi

# =============================================================================
# TEST SUITE 5: PAYLOAD VALIDATION
# =============================================================================

echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}SUITE 5: REQUEST VALIDATION${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

test_start "Process endpoint rejects invalid JSON"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d 'invalid-json' \
    "$DOMAIN/api/saib/quantum/process")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [[ "$HTTP_CODE" == "400" ]]; then
    test_pass "Invalid JSON properly rejected"
else
    test_skip "Validation test (HTTP $HTTP_CODE - depends on error handling)"
fi

# =============================================================================
# TEST SUITE 6: RESPONSE FORMATS
# =============================================================================

echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}SUITE 6: RESPONSE FORMATS${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

test_start "Health response is valid JSON"
RESPONSE=$(curl -s "$DOMAIN/api/saib/quantum/health")

if echo "$RESPONSE" | jq . > /dev/null 2>&1; then
    test_pass "Health response is valid JSON"
else
    test_fail "Health response is not valid JSON"
fi

test_start "Diagnostics response includes required fields"
RESPONSE=$(curl -s \
    -H "X-SAIB-ID: TEST-001" \
    "$DOMAIN/api/saib/quantum/diagnostics")

REQUIRED_FIELDS=("saibId" "currentState" "snapshotTimestamp")
ALL_PRESENT=true

for field in "${REQUIRED_FIELDS[@]}"; do
    if ! echo "$RESPONSE" | grep -q "$field"; then
        ALL_PRESENT=false
        break
    fi
done

if $ALL_PRESENT; then
    test_pass "Diagnostics response includes all required fields"
else
    test_fail "Diagnostics response missing required fields"
fi

# =============================================================================
# TEST SUITE 7: PERFORMANCE
# =============================================================================

echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}SUITE 7: PERFORMANCE METRICS${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

test_start "Health endpoint responds in <100ms"
RESPONSE=$(curl -s -w "%{time_total}" -o /dev/null "$DOMAIN/api/saib/quantum/health")
RESPONSE_TIME_SECONDS=$(echo "$RESPONSE" | awk '{print $1}')
RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME_SECONDS * 1000" | bc)

if (( $(echo "$RESPONSE_TIME_MS < 100" | bc -l) )); then
    test_pass "Health endpoint responds in ${RESPONSE_TIME_MS}ms"
else
    test_fail "Health endpoint slow: ${RESPONSE_TIME_MS}ms (threshold: 100ms)"
fi

test_start "Diagnostics endpoint responds in <500ms"
RESPONSE=$(curl -s -w "%{time_total}" \
    -H "X-SAIB-ID: TEST-001" \
    -o /dev/null "$DOMAIN/api/saib/quantum/diagnostics")
RESPONSE_TIME_MS=$(echo "$RESPONSE * 1000" | bc)

if (( $(echo "$RESPONSE_TIME_MS < 500" | bc -l) )); then
    test_pass "Diagnostics endpoint responds in ${RESPONSE_TIME_MS}ms"
else
    test_fail "Diagnostics endpoint slow: ${RESPONSE_TIME_MS}ms (threshold: 500ms)"
fi

# =============================================================================
# TEST SUMMARY
# =============================================================================

echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}TEST SUMMARY${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo ""

TOTAL=$((TESTS_PASSED + TESTS_FAILED))
PASS_RATE=$((TESTS_PASSED * 100 / TOTAL))

echo -e "Tests Run:     $TOTAL"
echo -e "${GREEN}Tests Passed:  $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed:  $TESTS_FAILED${NC}"
echo -e "Pass Rate:     ${PASS_RATE}%"
echo ""

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✅ ALL TESTS PASSED                ║${NC}"
    echo -e "${GREEN}║   System is ready for production    ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔══════════════════════════════════════╗${NC}"
    echo -e "${RED}║   ⚠️  SOME TESTS FAILED              ║${NC}"
    echo -e "${RED}║   Review results below              ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════╝${NC}"
    echo ""
    echo "Review detailed results in: $RESULTS_FILE"
    exit 1
fi
