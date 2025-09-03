#!/bin/bash

# ========================================
# Host-Based Honeypot Manager
# ========================================
# This script runs on the host and manages honeypots
# that are running as Docker containers on the same host

set -e

# Configuration
MANAGER_PORT=${MANAGER_PORT:-6000}
API_SECRET=${API_SECRET:-your_secure_secret_here}
DOCKER_SOCKET="/var/run/docker.sock"
LOG_FILE="/var/log/honeypot-manager.log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root (needed for Docker socket access)
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root to access Docker socket"
        exit 1
    fi
}

# Check if Docker socket is accessible
check_docker() {
    if [[ ! -S $DOCKER_SOCKET ]]; then
        print_error "Docker socket not found at $DOCKER_SOCKET"
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        print_error "Cannot connect to Docker daemon"
        exit 1
    fi
}

# Get honeypot status from Docker
get_honeypot_status() {
    local honeypot_name=$1
    
    # Check if container exists and is running
    if docker ps --format "table {{.Names}}" | grep -q "^${honeypot_name}$"; then
        echo "running"
    elif docker ps -a --format "table {{.Names}}" | grep -q "^${honeypot_name}$"; then
        echo "stopped"
    else
        echo "not_found"
    fi
}

# Start a honeypot container
start_honeypot() {
    local honeypot_name=$1
    local compose_path=$2
    
    print_status "Starting honeypot: $honeypot_name"
    
    if [[ ! -d "$compose_path" ]]; then
        print_error "Compose path not found: $compose_path"
        return 1
    fi
    
    cd "$compose_path"
    
    # Start the honeypot using docker-compose
    if docker-compose up -d; then
        print_status "Successfully started $honeypot_name"
        return 0
    else
        print_error "Failed to start $honeypot_name"
        return 1
    fi
}

# Stop a honeypot container
stop_honeypot() {
    local honeypot_name=$1
    local compose_path=$2
    
    print_status "Stopping honeypot: $honeypot_name"
    
    if [[ ! -d "$compose_path" ]]; then
        print_error "Compose path not found: $compose_path"
        return 1
    fi
    
    cd "$compose_path"
    
    # Stop the honeypot using docker-compose
    if docker-compose down; then
        print_status "Successfully stopped $honeypot_name"
        return 0
    else
        print_error "Failed to stop $honeypot_name"
        return 1
    fi
}

# Get status of all honeypots
get_all_status() {
    local status_json="{"
    local first=true
    
    # Define honeypot mappings (name -> compose path)
    declare -A honeypots=(
        ["ssh-honeypot"]="/home/demon/distributed-architecture/client-infrastructure/client-a/cpd-blocks/ssh-honeypot"
        ["ftp-honeypot"]="/home/demon/distributed-architecture/client-infrastructure/client-a/cpd-blocks/ftp-honeypot"
        ["telnet-honeypot"]="/home/demon/distributed-architecture/client-infrastructure/client-a/cpd-blocks/telnet-honeypot"
        ["https-honeypot"]="/home/demon/distributed-architecture/client-infrastructure/client-a/cpd-blocks/https-honeypot"
        ["siemens-honeypot"]="/home/demon/distributed-architecture/client-infrastructure/client-a/cpd-blocks/siemens-honeypot"
        ["honeywell-honeypot"]="/home/demon/distributed-architecture/client-infrastructure/client-a/cpd-blocks/honeywell-honeypot"
    )
    
    for honeypot_name in "${!honeypots[@]}"; do
        if [[ "$first" == true ]]; then
            first=false
        else
            status_json+=","
        fi
        
        local status=$(get_honeypot_status "$honeypot_name")
        status_json+="\"$honeypot_name\":\"$status\""
    done
    
    status_json+="}"
    echo "$status_json"
}

# HTTP response function
send_response() {
    local status_code=$1
    local content_type=$2
    local body=$3
    
    echo -e "HTTP/1.1 $status_code OK"
    echo -e "Content-Type: $content_type"
    echo -e "Content-Length: ${#body}"
    echo -e "Access-Control-Allow-Origin: *"
    echo -e "Access-Control-Allow-Methods: GET, POST, OPTIONS"
    echo -e "Access-Control-Allow-Headers: Content-Type, X-Api-Secret"
    echo -e ""
    echo -e "$body"
}

# Handle HTTP requests
handle_request() {
    local method=$1
    local path=$2
    local body=$3
    local api_secret=$4
    
    # Allow health endpoint without authentication
    if [[ "$path" == "/health" ]]; then
        send_response "200" "application/json" '{"status":"healthy"}'
        return
    fi
    
    # Check API secret for all other endpoints
    if [[ "$api_secret" != "$API_SECRET" ]]; then
        send_response "401" "application/json" '{"error":"Unauthorized"}'
        return
    fi
    
    case "$method" in
        "GET")
            case "$path" in
                "/status")
                    local status=$(get_all_status)
                    send_response "200" "application/json" "$status"
                    ;;
                *)
                    send_response "404" "application/json" '{"error":"Not found"}'
                    ;;
            esac
            ;;
        "POST")
            case "$path" in
                "/start")
                    # Parse honeypot name from JSON body
                    local honeypot_name=$(echo "$body" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
                    
                    if [[ -z "$honeypot_name" ]]; then
                        send_response "400" "application/json" '{"error":"Missing honeypot name"}'
                        return
                    fi
                    
                    # Define compose path mapping
                    local compose_path=""
                    case "$honeypot_name" in
                        "ssh-honeypot") compose_path="/home/demon/distributed-architecture/client-infrastructure/client-a/cpd-blocks/ssh-honeypot" ;;
                        "ftp-honeypot") compose_path="/home/demon/distributed-architecture/client-infrastructure/client-a/cpd-blocks/ftp-honeypot" ;;
                        "telnet-honeypot") compose_path="/home/demon/distributed-architecture/client-infrastructure/client-a/cpd-blocks/telnet-honeypot" ;;
                        "https-honeypot") compose_path="/home/demon/distributed-architecture/client-infrastructure/client-a/cpd-blocks/https-honeypot" ;;
                        "siemens-honeypot") compose_path="/home/demon/distributed-architecture/client-infrastructure/client-a/cpd-blocks/siemens-honeypot" ;;
                        "honeywell-honeypot") compose_path="/home/demon/distributed-architecture/client-infrastructure/client-a/cpd-blocks/honeywell-honeypot" ;;
                        *) 
                            send_response "400" "application/json" '{"error":"Unknown honeypot"}'
                            return
                            ;;
                    esac
                    
                    if start_honeypot "$honeypot_name" "$compose_path"; then
                        send_response "200" "application/json" '{"message":"Honeypot started successfully"}'
                    else
                        send_response "500" "application/json" '{"error":"Failed to start honeypot"}'
                    fi
                    ;;
                "/stop")
                    # Parse honeypot name from JSON body
                    local honeypot_name=$(echo "$body" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
                    
                    if [[ -z "$honeypot_name" ]]; then
                        send_response "400" "application/json" '{"error":"Missing honeypot name"}'
                        return
                    fi
                    
                    # Define compose path mapping
                    local compose_path=""
                    case "$honeypot_name" in
                        "ssh-honeypot") compose_path="/home/demon/distributed-architecture/client-infrastructure/client-a/cpd-blocks/ssh-honeypot" ;;
                        "ftp-honeypot") compose_path="/home/demon/distributed-architecture/client-infrastructure/client-a/cpd-blocks/ftp-honeypot" ;;
                        "telnet-honeypot") compose_path="/home/demon/distributed-architecture/client-infrastructure/client-a/cpd-blocks/telnet-honeypot" ;;
                        "https-honeypot") compose_path="/home/demon/distributed-architecture/client-infrastructure/client-a/cpd-blocks/https-honeypot" ;;
                        "siemens-honeypot") compose_path="/home/demon/distributed-architecture/client-infrastructure/client-a/cpd-blocks/siemens-honeypot" ;;
                        "honeywell-honeypot") compose_path="/home/demon/distributed-architecture/client-infrastructure/client-a/cpd-blocks/honeywell-honeypot" ;;
                        *) 
                            send_response "400" "application/json" '{"error":"Unknown honeypot"}'
                            return
                            ;;
                    esac
                    
                    if stop_honeypot "$honeypot_name" "$compose_path"; then
                        send_response "200" "application/json" '{"message":"Honeypot stopped successfully"}'
                    else
                        send_response "500" "application/json" '{"error":"Failed to stop honeypot"}'
                    fi
                    ;;
                *)
                    send_response "404" "application/json" '{"error":"Not found"}'
                    ;;
            esac
            ;;
        "OPTIONS")
            send_response "200" "text/plain" ""
            ;;
        *)
            send_response "405" "application/json" '{"error":"Method not allowed"}'
            ;;
    esac
}

# Parse HTTP request
parse_request() {
    local request_line
    read -r request_line
    
    # Parse method and path
    local method=$(echo "$request_line" | cut -d' ' -f1)
    local path=$(echo "$request_line" | cut -d' ' -f2)
    
    # Read headers
    local content_length=0
    local api_secret=""
    
    while IFS= read -r line; do
        line=$(echo "$line" | tr -d '\r')
        
        # Empty line marks end of headers
        if [[ -z "$line" ]]; then
            break
        fi
        
        # Parse Content-Length
        if [[ "$line" =~ ^Content-Length:[[:space:]]*([0-9]+)$ ]]; then
            content_length="${BASH_REMATCH[1]}"
        fi
        
        # Parse X-Api-Secret
        if [[ "$line" =~ ^X-Api-Secret:[[:space:]]*(.+)$ ]]; then
            api_secret="${BASH_REMATCH[1]}"
        fi
    done
    
    # Read body if present
    local body=""
    if [[ $content_length -gt 0 ]]; then
        read -r -n "$content_length" body
    fi
    
    # Handle the request
    handle_request "$method" "$path" "$body" "$api_secret"
}

# Main server loop
main() {
    print_status "Starting Host-Based Honeypot Manager on port $MANAGER_PORT"
    print_status "API Secret: $API_SECRET"
    
    # Check prerequisites
    check_permissions
    check_docker
    
    # Create log file
    touch "$LOG_FILE"
    
    # Start netcat server
    print_status "Server ready. Listening on port $MANAGER_PORT"
    
    while true; do
        # Use netcat to listen for connections
        nc -l -p "$MANAGER_PORT" | parse_request 2>> "$LOG_FILE"
    done
}

# Handle script arguments
case "${1:-}" in
    "start")
        main
        ;;
    "status")
        get_all_status
        ;;
    "health")
        echo '{"status":"healthy"}'
        ;;
    *)
        echo "Usage: $0 {start|status|health}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the honeypot manager server"
        echo "  status  - Get status of all honeypots"
        echo "  health  - Check manager health"
        exit 1
        ;;
esac 