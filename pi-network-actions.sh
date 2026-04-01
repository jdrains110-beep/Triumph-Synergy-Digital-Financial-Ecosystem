#!/bin/bash
# ==============================================================================
# Pi Network Container Actions
# ==============================================================================
# 
# Unified container management for Triumph Synergy + Central Node
# Central Node: GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V
#
# Usage:
#   ./pi-network-actions.sh [action] [service]
#
# Actions:
#   start       - Start all or specific service
#   stop        - Stop all or specific service
#   restart     - Restart all or specific service
#   status      - Show status of all or specific service
#   logs        - Show logs (follows)
#   build       - Build all or specific service
#   pull        - Pull latest images
#   clean       - Clean up containers, images, volumes
#   health      - Check health of all services
#   scale       - Scale a service (e.g., ./pi-network-actions.sh scale pi-transaction-engine 3)
# ==============================================================================

set -e

# Configuration
COMPOSE_FILE="docker-compose.pi-network.yml"
PROJECT_NAME="pi-network-triumph-synergy"
CENTRAL_NODE="GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
print_banner() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}         ${GREEN}PI NETWORK CONTAINER ACTIONS${NC}                          ${CYAN}║${NC}"
    echo -e "${CYAN}╠════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}  Central Node: ${YELLOW}${CENTRAL_NODE}${NC}"
    echo -e "${CYAN}║${NC}  Project:      ${BLUE}${PROJECT_NAME}${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Service groups
PI_INFRASTRUCTURE=(
    "pi-postgres"
    "pi-redis-cluster"
)

PI_CORE_SERVICES=(
    "pi-central-node"
    "pi-triumph-app"
)

PI_TRANSACTION_SERVICES=(
    "pi-transaction-engine"
    "pi-trillion-vault"
    "pi-smart-contracts"
    "pi-scp-upgrader"
)

PI_SUPPORT_SERVICES=(
    "pi-payment-processor"
    "pi-nginx"
)

PI_MONITORING=(
    "pi-prometheus"
    "pi-grafana"
)

# Get all services
all_services() {
    echo "${PI_INFRASTRUCTURE[@]} ${PI_CORE_SERVICES[@]} ${PI_TRANSACTION_SERVICES[@]} ${PI_SUPPORT_SERVICES[@]} ${PI_MONITORING[@]}"
}

# Docker Compose command
dc() {
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" "$@"
}

# Start services
start_services() {
    local service=$1
    print_banner
    echo -e "${GREEN}Starting Pi Network services...${NC}"
    
    if [ -z "$service" ]; then
        echo -e "${YELLOW}Starting all services in order...${NC}"
        
        echo -e "\n${BLUE}Phase 1: Infrastructure${NC}"
        dc up -d "${PI_INFRASTRUCTURE[@]}"
        sleep 5
        
        echo -e "\n${BLUE}Phase 2: Core Services${NC}"
        dc up -d "${PI_CORE_SERVICES[@]}"
        sleep 10
        
        echo -e "\n${BLUE}Phase 3: Transaction Services${NC}"
        dc up -d "${PI_TRANSACTION_SERVICES[@]}"
        sleep 5
        
        echo -e "\n${BLUE}Phase 4: Support Services${NC}"
        dc up -d "${PI_SUPPORT_SERVICES[@]}"
        
        echo -e "\n${BLUE}Phase 5: Monitoring${NC}"
        dc up -d "${PI_MONITORING[@]}"
    else
        echo -e "${YELLOW}Starting service: $service${NC}"
        dc up -d "$service"
    fi
    
    echo -e "\n${GREEN}✓ Pi Network services started${NC}"
}

# Stop services
stop_services() {
    local service=$1
    print_banner
    echo -e "${RED}Stopping Pi Network services...${NC}"
    
    if [ -z "$service" ]; then
        dc down
    else
        dc stop "$service"
    fi
    
    echo -e "\n${GREEN}✓ Services stopped${NC}"
}

# Restart services
restart_services() {
    local service=$1
    print_banner
    echo -e "${YELLOW}Restarting Pi Network services...${NC}"
    
    if [ -z "$service" ]; then
        stop_services
        start_services
    else
        dc restart "$service"
    fi
    
    echo -e "\n${GREEN}✓ Services restarted${NC}"
}

# Show status
show_status() {
    local service=$1
    print_banner
    echo -e "${CYAN}Pi Network Container Status${NC}"
    echo ""
    
    if [ -z "$service" ]; then
        dc ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
    else
        dc ps "$service" --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
    fi
    
    echo ""
    echo -e "${CYAN}Service Groups:${NC}"
    echo -e "  ${BLUE}Infrastructure:${NC} ${PI_INFRASTRUCTURE[*]}"
    echo -e "  ${BLUE}Core:${NC} ${PI_CORE_SERVICES[*]}"
    echo -e "  ${BLUE}Transaction:${NC} ${PI_TRANSACTION_SERVICES[*]}"
    echo -e "  ${BLUE}Support:${NC} ${PI_SUPPORT_SERVICES[*]}"
    echo -e "  ${BLUE}Monitoring:${NC} ${PI_MONITORING[*]}"
}

# Show logs
show_logs() {
    local service=$1
    print_banner
    echo -e "${CYAN}Showing logs...${NC}"
    
    if [ -z "$service" ]; then
        dc logs -f --tail=100
    else
        dc logs -f --tail=100 "$service"
    fi
}

# Build services
build_services() {
    local service=$1
    print_banner
    echo -e "${BLUE}Building Pi Network services...${NC}"
    
    if [ -z "$service" ]; then
        dc build --parallel
    else
        dc build "$service"
    fi
    
    echo -e "\n${GREEN}✓ Build complete${NC}"
}

# Pull images
pull_images() {
    print_banner
    echo -e "${BLUE}Pulling latest images...${NC}"
    dc pull
    echo -e "\n${GREEN}✓ Images updated${NC}"
}

# Clean up
cleanup() {
    print_banner
    echo -e "${RED}Cleaning up Pi Network resources...${NC}"
    
    echo -e "\n${YELLOW}Stopping all containers...${NC}"
    dc down -v --remove-orphans
    
    echo -e "\n${YELLOW}Removing dangling images...${NC}"
    docker image prune -f
    
    echo -e "\n${YELLOW}Removing unused networks...${NC}"
    docker network prune -f
    
    echo -e "\n${GREEN}✓ Cleanup complete${NC}"
}

# Health check
health_check() {
    print_banner
    echo -e "${CYAN}Pi Network Health Check${NC}"
    echo ""
    
    services=(
        "pi-postgres:5432"
        "pi-redis:6379"
        "pi-central-node:11626"
        "pi-triumph-app:3000"
        "pi-transaction-engine:8080"
        "pi-trillion-vault:8081"
        "pi-smart-contracts:8082"
        "pi-scp-upgrader:8083"
        "pi-nginx:80"
    )
    
    for svc in "${services[@]}"; do
        name="${svc%%:*}"
        port="${svc##*:}"
        
        if docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps "$name" 2>/dev/null | grep -q "Up"; then
            echo -e "  ${GREEN}✓${NC} $name (port $port) - ${GREEN}HEALTHY${NC}"
        else
            echo -e "  ${RED}✗${NC} $name (port $port) - ${RED}DOWN${NC}"
        fi
    done
    
    echo ""
    echo -e "${CYAN}Central Node Status:${NC}"
    echo -e "  Public Key: ${YELLOW}${CENTRAL_NODE}${NC}"
    
    # Check if central node is responding
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:11626/info 2>/dev/null | grep -q "200"; then
        echo -e "  Status: ${GREEN}ONLINE${NC}"
    else
        echo -e "  Status: ${YELLOW}Not accessible from host${NC}"
    fi
}

# Scale service
scale_service() {
    local service=$1
    local replicas=$2
    print_banner
    
    if [ -z "$service" ] || [ -z "$replicas" ]; then
        echo -e "${RED}Usage: $0 scale <service> <replicas>${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}Scaling $service to $replicas replicas...${NC}"
    dc up -d --scale "$service=$replicas"
    echo -e "\n${GREEN}✓ Scaled $service to $replicas replicas${NC}"
}

# Main
action=$1
service=$2
extra=$3

case "$action" in
    start)
        start_services "$service"
        ;;
    stop)
        stop_services "$service"
        ;;
    restart)
        restart_services "$service"
        ;;
    status)
        show_status "$service"
        ;;
    logs)
        show_logs "$service"
        ;;
    build)
        build_services "$service"
        ;;
    pull)
        pull_images
        ;;
    clean)
        cleanup
        ;;
    health)
        health_check
        ;;
    scale)
        scale_service "$service" "$extra"
        ;;
    *)
        print_banner
        echo -e "${YELLOW}Usage: $0 <action> [service] [extra]${NC}"
        echo ""
        echo -e "${CYAN}Actions:${NC}"
        echo "  start   [service]     - Start all or specific service"
        echo "  stop    [service]     - Stop all or specific service"
        echo "  restart [service]     - Restart all or specific service"
        echo "  status  [service]     - Show status"
        echo "  logs    [service]     - Show logs (follows)"
        echo "  build   [service]     - Build services"
        echo "  pull                  - Pull latest images"
        echo "  clean                 - Clean up everything"
        echo "  health                - Health check all services"
        echo "  scale   <svc> <num>   - Scale a service"
        echo ""
        echo -e "${CYAN}Services:${NC}"
        echo "  Infrastructure: ${PI_INFRASTRUCTURE[*]}"
        echo "  Core: ${PI_CORE_SERVICES[*]}"
        echo "  Transaction: ${PI_TRANSACTION_SERVICES[*]}"
        echo "  Support: ${PI_SUPPORT_SERVICES[*]}"
        echo "  Monitoring: ${PI_MONITORING[*]}"
        exit 1
        ;;
esac
