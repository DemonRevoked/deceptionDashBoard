#!/usr/bin/env bash
#
# record every SSH session to /var/log/tty/<timestamp>.tty
#

LOG_DIR="/var/log/tty"
mkdir -p "$LOG_DIR"

# unique session filename
SESSION_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
TTY_FILE="$LOG_DIR/session-${SESSION_ID}.tty"

# -q: quiet, -f: flush after each write
exec script -q -f "$TTY_FILE" /bin/bash
