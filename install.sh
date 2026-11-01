#!/usr/bin/env bash
# ==============================================================================
# LokSync - Universal Linux Terminal Installer
# ==============================================================================
# Installs lok-sync daemon, graphical desktop app, systemd user services,
# and desktop application shortcuts.
#
# Works on: NixOS, Arch Linux, Ubuntu, Debian, Fedora, openSUSE, Void, etc.
# ==============================================================================

set -euo pipefail

# Visual formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[*]${NC} $*"; }
ok()    { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
err()   { echo -e "${RED}[✗]${NC} $*" >&2; exit 1; }

echo -e "${BLUE}${BOLD}"
echo "  _          _     ____                    "
echo " | |    ___ | | __/ ___| _   _ _ __   ___  "
echo " | |   / _ \| |/ /\___ \| | | | '_ \ / __| "
echo " | |__| (_) |   <  ___) | |_| | | | | (__  "
echo " |_____\___/|_|\_\|____/ \__, |_| |_|\___| "
echo "                         |___/             "
echo -e "${NC}"
echo -e "  ${BOLD}Ultra-Lightweight Phone <-> Linux Bridge (KDE Connect & LocalSend alternative)${NC}\n"

# Installation destination paths
BIN_DIR="${HOME}/.local/bin"
SYSTEMD_USER_DIR="${HOME}/.config/systemd/user"
APPS_DIR="${HOME}/.local/share/applications"
CONFIG_DIR="${HOME}/.config/lok-sync"

# Check if uninstall flag is passed
if [[ "${1:-}" == "--uninstall" ]]; then
    info "Uninstalling LokSync..."
    systemctl --user stop lok-sync.service 2>/dev/null || true
    systemctl --user disable lok-sync.service 2>/dev/null || true
    rm -f "${BIN_DIR}/lok-sync-d" "${BIN_DIR}/lok-sync-gui" "${BIN_DIR}/lok-sync" "${BIN_DIR}/loksync"
    rm -f "${SYSTEMD_USER_DIR}/lok-sync.service" "${SYSTEMD_USER_DIR}/lok-sync.slice" "${SYSTEMD_USER_DIR}/lok-sync-gui.service"
    rm -f "${APPS_DIR}/lok-sync-gui.desktop"
    systemctl --user daemon-reload 2>/dev/null || true
    ok "LokSync has been completely uninstalled from your user environment."
    exit 0
fi

# Determine source directory (where script is located)
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SRC_DIR}"

info "Checking system requirements..."

# Verify cargo or existing binaries
HAS_CARGO=0
if command -v cargo >/dev/null 2>&1; then
    HAS_CARGO=1
fi

HAS_BINARIES=0
if [[ -f "${SRC_DIR}/target/release/lok-sync-d" && -f "${SRC_DIR}/target/release/lok-sync-gui" ]]; then
    HAS_BINARIES=1
fi

# Build if needed
if [[ ${HAS_BINARIES} -eq 0 ]]; then
    if [[ ${HAS_CARGO} -eq 0 ]]; then
        err "Neither pre-compiled binaries nor 'cargo' was found. Please install Rust (https://rustup.rs) or build with Nix."
    fi
    info "Building LokSync binaries in release mode..."
    if command -v npm >/dev/null 2>&1; then
        (cd crates/lok-sync-gui/ui && npm run build)
    fi
    cargo build --release
fi

ok "Binaries verified."

# Create directories
info "Installing files to user environment..."
mkdir -p "${BIN_DIR}"
mkdir -p "${SYSTEMD_USER_DIR}"
mkdir -p "${APPS_DIR}"
mkdir -p "${CONFIG_DIR}"

# Install executables
install -m 755 "${SRC_DIR}/target/release/lok-sync-d" "${BIN_DIR}/lok-sync-d"
install -m 755 "${SRC_DIR}/target/release/lok-sync" "${BIN_DIR}/lok-sync"
install -m 755 "${SRC_DIR}/target/release/lok-sync-gui" "${BIN_DIR}/lok-sync-gui"
ln -sf "${BIN_DIR}/lok-sync" "${BIN_DIR}/loksync"
ok "Installed executables (lok-sync-d, lok-sync CLI, lok-sync-gui) to ${BIN_DIR}/"

# Install systemd user services
install -m 644 "${SRC_DIR}/dist/systemd/lok-sync.service" "${SYSTEMD_USER_DIR}/lok-sync.service"
install -m 644 "${SRC_DIR}/dist/systemd/lok-sync.slice" "${SYSTEMD_USER_DIR}/lok-sync.slice"
install -m 644 "${SRC_DIR}/dist/systemd/lok-sync-gui.service" "${SYSTEMD_USER_DIR}/lok-sync-gui.service"
ok "Installed systemd user units to ${SYSTEMD_USER_DIR}/"

# Install default config if not present
if [[ ! -f "${CONFIG_DIR}/config.toml" ]]; then
    install -m 644 "${SRC_DIR}/dist/config.toml" "${CONFIG_DIR}/config.toml"
    ok "Installed default configuration to ${CONFIG_DIR}/config.toml"
fi

# Install desktop shortcut
install -m 644 "${SRC_DIR}/dist/desktop/lok-sync-gui.desktop" "${APPS_DIR}/lok-sync-gui.desktop"
ok "Installed application launcher to ${APPS_DIR}/lok-sync-gui.desktop"

# Reload systemd and start service
info "Reloading systemd user daemon and starting background service..."
systemctl --user daemon-reload || true
systemctl --user enable --now lok-sync.service || true

# PATH warning check
if [[ ":$PATH:" != *":${BIN_DIR}:"* ]]; then
    warn "${BIN_DIR} is not currently in your PATH."
    warn "Add the following line to your ~/.bashrc or ~/.zshrc:"
    warn "  export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

echo ""
echo -e "${GREEN}${BOLD}==============================================================================${NC}"
echo -e "${GREEN}${BOLD}              🎉 LokSync Successfully Installed & Running!                   ${NC}"
echo -e "${GREEN}${BOLD}==============================================================================${NC}"
echo ""
echo -e "  ${BOLD}Open GUI Desktop App:${NC}"
echo -e "    ${CYAN}lok-sync-gui${NC}  (or search 'LokSync' in your application menu/launcher)"
echo ""
echo -e "  ${BOLD}Background Service Management:${NC}"
echo -e "    Status:   ${CYAN}systemctl --user status lok-sync.service${NC}"
echo -e "    Logs:     ${CYAN}journalctl --user -u lok-sync.service -f${NC}"
echo -e "    Restart:  ${CYAN}systemctl --user restart lok-sync.service${NC}"
echo ""
echo -e "  ${BOLD}Uninstall:${NC}"
echo -e "    ${CYAN}./install.sh --uninstall${NC}"
echo ""
