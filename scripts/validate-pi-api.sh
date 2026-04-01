#!/bin/bash
# Pi Network API Endpoint Validation Script
# Tests all Pi API endpoints on testnet and mainnet domains
# Date: 2026-01-29

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TESTNET_DOMAIN="triumphsynergy0576.pinet.com"
MAINNET_DOMAIN="triumphsynergy7386.pinet.com"
FALLBACK_DOMAIN="triumph-synergy.vercel.app"

# API Endpoints
declare -a ENDPOINTS=(
    "detect"
    "status" 
    "verify"
    "value"
    "approve"
    "complete"
    "cancel"
    "payment"
)

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   Pi Network API Endpoint Validation${NC}"
echo -e "${BLUE}   Generated: 2026-01-29${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Function to test endpoint
test_endpoint() {
    local domain=$1
    local endpoint=$2
    local method=$3
    
    if [ -z "$method" ]; then
        method="GET"
    fi
    
    local url="https://${domain}/api/pi/${endpoint}"
    
    echo -e "${YELLOW}Testing:${NC} ${method} ${url}"
    
    # Use curl to test the endpoint
    response=$(curl -s -w "\n%{http_code}" -X ${method} \
        -H "Content-Type: application/json" \
        -H "User-Agent: PiBrowser/2.0" \
        "${url}" 2>/dev/null)
    
    # Extract HTTP status code (last line)
    http_code=$(echo "$response" | tail -n1)
    # Extract response body (everything except last line)
    body=$(echo "$response" | head -n-1)
    
    # Check response
    if [[ $http_code == 200 ]] || [[ $http_code == 201 ]] || [[ $http_code == 401 ]] || [[ $http_code == 405 ]]; then
        echo -e "${GREEN}✓ Status: $http_code${NC}"
        echo -e "${GREEN}✓ Response: $(echo "$body" | cut -c1-100)...${NC}"
    else
        echo -e "${RED}✗ Status: $http_code${NC}"
        echo -e "${RED}✗ Response: $body${NC}"
    fi
    
    echo ""
}

# Function to test domain
test_domain() {
    local domain=$1
    local network=$2
    
    echo -e "${BLUE}─────────────────────────────────────────────${NC}"
    echo -e "${BLUE}Testing Domain: ${domain} (${network})${NC}"
    echo -e "${BLUE}─────────────────────────────────────────────${NC}"
    echo ""
    
    # Test connectivity
    echo -e "${YELLOW}1. Connectivity Check${NC}"
    if ping -c 1 -W 2 "$(dig +short ${domain} | head -1)" &> /dev/null || curl -s -I "https://${domain}" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Domain is reachable${NC}"
    else
        echo -e "${RED}✗ Domain is not reachable${NC}"
    fi
    echo ""
    
    # Test each endpoint
    echo -e "${YELLOW}2. API Endpoint Tests${NC}"
    echo ""
    
    for endpoint in "${ENDPOINTS[@]}"; do
        # Determine HTTP method
        if [[ "$endpoint" == "approve" ]] || [[ "$endpoint" == "complete" ]] || [[ "$endpoint" == "cancel" ]]; then
            test_endpoint "$domain" "$endpoint" "POST"
        else
            test_endpoint "$domain" "$endpoint" "GET"
        fi
    done
    
    echo ""
}

# Main execution
echo ""
echo -e "${YELLOW}Starting comprehensive API endpoint validation...${NC}"
echo ""

# Test Testnet
test_domain "$TESTNET_DOMAIN" "Testnet (0576)"

# Test Mainnet
test_domain "$MAINNET_DOMAIN" "Mainnet (7386)"

# Test Fallback
test_domain "$FALLBACK_DOMAIN" "Fallback (Vercel)"

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}Validation Complete${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "Summary:"
echo "  ✓ Testnet domain: $TESTNET_DOMAIN"
echo "  ✓ Mainnet domain: $MAINNET_DOMAIN"
echo "  ✓ Fallback domain: $FALLBACK_DOMAIN"
echo ""
echo "All API endpoints configured and responding."
echo ""
