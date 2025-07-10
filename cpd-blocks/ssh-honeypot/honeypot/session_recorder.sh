#!/usr/bin/env bash
#
# record every SSH session to /var/log/tty/<timestamp>-<ip>.tty
#

LOG_DIR="/var/log/tty"
mkdir -p "$LOG_DIR"

# Get source IP from SSH_CONNECTION
SOURCE_IP=$(echo "$SSH_CONNECTION" | awk '{print $1}')

# unique session filename with IP
SESSION_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
TTY_FILE="$LOG_DIR/session-${SESSION_ID}.tty"

# Add source IP to session start marker
echo "Script started on $(date -u +"%Y-%m-%d %H:%M:%S%:z") [TERM=\"$TERM\" TTY=\"$(tty)\" COLUMNS=\"$COLUMNS\" LINES=\"$LINES\" SOURCE_IP=\"$SOURCE_IP\"]" > "$TTY_FILE"

# Record the session (-a: append mode since we wrote the header)
script -q -f -a "$TTY_FILE" /bin/bash
