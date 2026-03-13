#!/usr/bin/env bash
# fail2ban setup for ephemeris vuln scanner auto-ban
# Must be run as root on the Docker host
#
# Usage:
#   sudo ./setup.sh install     # install and start fail2ban with dead man's switch
#   sudo ./setup.sh rollback    # undo everything: flush rules, stop fail2ban, remove configs
#   sudo ./setup.sh status      # show current bans and iptables rules

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FILTER_SRC="$SCRIPT_DIR/filter.conf"
JAIL_SRC="$SCRIPT_DIR/jail.conf"
ACTION_SRC="$SCRIPT_DIR/action.conf"

FILTER_DST="/etc/fail2ban/filter.d/ephemeris-scanner.conf"
JAIL_DST="/etc/fail2ban/jail.d/ephemeris.conf"
ACTION_DST="/etc/fail2ban/action.d/ephemeris-docker-drop.conf"

LOG_DIR="/var/log/ephemeris"

# Dead man's switch timeout (minutes)
DEADMAN_TIMEOUT="${DEADMAN_TIMEOUT:-30}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (sudo)"
        exit 1
    fi
}

# ---------------------------------------------------------------------------
# Rollback: undo everything
# ---------------------------------------------------------------------------
rollback() {
    info "Rolling back fail2ban ephemeris configuration..."

    # Stop the ephemeris jail if fail2ban is running
    if systemctl is-active --quiet fail2ban 2>/dev/null; then
        fail2ban-client status ephemeris-scanner 2>/dev/null && \
            fail2ban-client stop ephemeris-scanner 2>/dev/null || true
        info "Stopped ephemeris-scanner jail"
    fi

    # Flush our iptables rules from DOCKER-USER and INPUT
    # Remove all DROP rules we may have inserted (best-effort)
    info "Flushing iptables DROP rules from DOCKER-USER and INPUT..."
    while iptables -D DOCKER-USER -j DROP 2>/dev/null; do :; done
    while iptables -D INPUT -j DROP 2>/dev/null; do :; done
    info "iptables rules flushed"

    # Remove config files
    for f in "$FILTER_DST" "$JAIL_DST" "$ACTION_DST"; do
        if [[ -f "$f" ]]; then
            rm -f "$f"
            info "Removed $f"
        fi
    done

    # Reload fail2ban if it's running (so it forgets the jail)
    if systemctl is-active --quiet fail2ban 2>/dev/null; then
        fail2ban-client reload 2>/dev/null || true
        info "Reloaded fail2ban"
    fi

    # Cancel any pending dead man's switch at jobs
    cancel_deadman_jobs

    info "Rollback complete"
}

# ---------------------------------------------------------------------------
# Cancel any at jobs created by this script
# ---------------------------------------------------------------------------
cancel_deadman_jobs() {
    local job_file="/var/run/ephemeris-deadman-atjob"
    if [[ -f "$job_file" ]]; then
        local job_id
        job_id=$(cat "$job_file")
        if atrm "$job_id" 2>/dev/null; then
            info "Cancelled dead man's switch (at job $job_id)"
        else
            warn "at job $job_id already completed or not found"
        fi
        rm -f "$job_file"
    else
        warn "No dead man's switch job file found at $job_file"
    fi
}

# ---------------------------------------------------------------------------
# Install
# ---------------------------------------------------------------------------
install() {
    info "Installing fail2ban for ephemeris scanner detection..."

    # Check dependencies
    for cmd in fail2ban-client iptables at atd; do
        if ! command -v "$cmd" &>/dev/null; then
            error "'$cmd' not found. Install it first:"
            case "$cmd" in
                fail2ban-client) echo "  apt install fail2ban  (Debian/Ubuntu)" ;;
                at|atd)         echo "  apt install at         (Debian/Ubuntu)" ;;
                iptables)       echo "  apt install iptables   (Debian/Ubuntu)" ;;
            esac
            exit 1
        fi
    done

    # Ensure atd is running (needed for dead man's switch)
    if ! systemctl is-active --quiet atd 2>/dev/null; then
        systemctl start atd
        systemctl enable atd
        info "Started and enabled atd service"
    fi

    # Create log directory
    mkdir -p "$LOG_DIR"
    info "Created $LOG_DIR"

    # Ensure DOCKER-USER chain exists (Docker creates it, but just in case)
    iptables -N DOCKER-USER 2>/dev/null || true

    # Copy config files
    cp "$FILTER_SRC" "$FILTER_DST"
    info "Installed filter  → $FILTER_DST"

    cp "$JAIL_SRC" "$JAIL_DST"
    info "Installed jail    → $JAIL_DST"

    cp "$ACTION_SRC" "$ACTION_DST"
    info "Installed action  → $ACTION_DST"

    # Start/reload fail2ban
    if systemctl is-active --quiet fail2ban; then
        fail2ban-client reload
        info "Reloaded fail2ban"
    else
        systemctl start fail2ban
        systemctl enable fail2ban
        info "Started and enabled fail2ban"
    fi

    # Verify the jail is running
    sleep 1
    if fail2ban-client status ephemeris-scanner &>/dev/null; then
        info "Jail 'ephemeris-scanner' is active"
    else
        error "Jail failed to start — check 'fail2ban-client status' and logs"
        exit 1
    fi

    # -----------------------------------------------------------------------
    # Dead man's switch: schedule automatic rollback
    # If you don't cancel this at job, it will rollback everything
    # -----------------------------------------------------------------------
    info ""
    info "Setting dead man's switch: auto-rollback in $DEADMAN_TIMEOUT minutes"
    info "If you get locked out, just wait — access will be restored automatically."
    info ""

    local at_output
    at_output=$(echo "$SCRIPT_DIR/setup.sh rollback 2>&1 | logger -t ephemeris-deadman" \
        | at "now + $DEADMAN_TIMEOUT minutes" 2>&1)

    # Parse the at job ID from output like "job 42 at Thu Mar 13 12:30:00 2026"
    local job_id
    job_id=$(echo "$at_output" | grep -oP 'job \K[0-9]+')

    if [[ -n "$job_id" ]]; then
        echo "$job_id" > /var/run/ephemeris-deadman-atjob
        info "=============================================="
        info "  DEAD MAN'S SWITCH: at job ID = ${job_id}"
        info "  Auto-rollback in $DEADMAN_TIMEOUT minutes"
        info ""
        info "  To CANCEL the rollback (keep fail2ban running):"
        info "    sudo atrm ${job_id}"
        info "    sudo rm /var/run/ephemeris-deadman-atjob"
        info ""
        info "  Or use this script:"
        info "    sudo $SCRIPT_DIR/setup.sh cancel-deadman"
        info "=============================================="
    else
        warn "Could not parse at job ID from output: $at_output"
        warn "Dead man's switch may not be set — check 'atq' manually"
    fi
}

# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------
status() {
    echo ""
    info "=== fail2ban jail status ==="
    fail2ban-client status ephemeris-scanner 2>/dev/null || warn "Jail not running"

    echo ""
    info "=== DOCKER-USER DROP rules ==="
    iptables -L DOCKER-USER -n --line-numbers 2>/dev/null | grep -i drop || echo "  (none)"

    echo ""
    info "=== INPUT DROP rules ==="
    iptables -L INPUT -n --line-numbers 2>/dev/null | grep -i drop || echo "  (none)"

    echo ""
    info "=== Dead man's switch ==="
    local job_file="/var/run/ephemeris-deadman-atjob"
    if [[ -f "$job_file" ]]; then
        local job_id
        job_id=$(cat "$job_file")
        local job_info
        job_info=$(atq 2>/dev/null | grep "^${job_id}[[:space:]]" || true)
        if [[ -n "$job_info" ]]; then
            info "Active: at job $job_id — $job_info"
            info "Cancel with: sudo atrm $job_id"
        else
            warn "Job file exists (ID $job_id) but job not found in atq — may have already fired"
        fi
    else
        echo "  No dead man's switch active"
    fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
check_root

case "${1:-}" in
    install)
        install
        ;;
    rollback)
        rollback
        ;;
    status)
        status
        ;;
    cancel-deadman)
        cancel_deadman_jobs
        ;;
    *)
        echo "Usage: $0 {install|rollback|status|cancel-deadman}"
        echo ""
        echo "  install        Install fail2ban configs and start jail (with dead man's switch)"
        echo "  rollback       Stop jail, flush iptables DROP rules, remove configs"
        echo "  status         Show current bans, DROP rules, and dead man's switch state"
        echo "  cancel-deadman Cancel the auto-rollback at job (keep fail2ban running)"
        echo ""
        echo "Environment:"
        echo "  DEADMAN_TIMEOUT  Minutes before auto-rollback (default: 30)"
        exit 1
        ;;
esac
