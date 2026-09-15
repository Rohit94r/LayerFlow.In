#!/usr/bin/env bash
#
# LayerFlow Terminal (lf) — one-line installer (macOS / Linux / Windows via Git Bash/WSL).
#
#   curl -fsSL https://raw.githubusercontent.com/Rohit94r/LayerFlow.In/main/terminal/scripts/install.sh | bash
#
# Downloads the latest lf release from the public binary repo
# (Rohit94r/layerflow-releases), verifies its SHA-256 checksum, installs it
# to ~/.local/bin, adds a `layerflow` alias, and (unless --no-modify-path)
# adds the folder to your shell's PATH.
#
# Options:
#   -h, --help              Show usage
#   -v, --version <ver>     Install a specific version (default: latest)
#       --no-modify-path    Don't touch shell config files
#   LF_INSTALL_DIR=PATH     Install dir (default: ~/.local/bin)
#   LF_VERSION=x.y.z        Pin a version (env alternative to --version)

set -euo pipefail

REPO="Rohit94r/layerflow-releases"
APP="lf"
ALIAS="layerflow"
INSTALL_DIR="${LF_INSTALL_DIR:-${INSTALL_DIR:-$HOME/.local/bin}}"
VERSION="latest"

say() { printf '\033[1;32m[layerflow]\033[0m %s\n' "$*"; }
good() { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*" >&2; }
die() { printf '\033[1;31m[layerflow] error:\033[0m %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
LayerFlow Terminal installer

Usage: install.sh [options]

Options:
    -h, --help              Show this help message
    -v, --version <ver>     Install a specific version (e.g. 0.2.20)
        --no-modify-path    Don't modify shell config files (.zshrc, .bashrc, …)

Examples:
    curl -fsSL https://layerflow.dev/install | bash
    curl -fsSL https://layerflow.dev/install | bash -s -- --version 0.2.20
EOF
}

no_modify_path=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    -v|--version)
      [[ -n "${2:-}" ]] || die "--version requires an argument"
      VERSION="$2"; shift 2 ;;
    --no-modify-path) no_modify_path=true; shift ;;
    *) die "unknown option '$1' (see --help)" ;;
  esac
done

command -v curl >/dev/null 2>&1 || die "'curl' is required but not installed"

# ── Detect OS / arch ───────────────────────────────────────────────────────
case "$(uname -s)" in
  Darwin*)          os=darwin ;;
  Linux*)           os=linux ;;
  MINGW*|MSYS*|CYGWIN*) os=windows ;;
  *) die "unsupported OS: $(uname -s)" ;;
esac
case "$(uname -m)" in
  x86_64|amd64)            arch=amd64 ;;
  arm64|aarch64)           arch=arm64 ;;
  *) die "unsupported architecture: $(uname -m)" ;;
esac

# ── Resolve version + artifact ─────────────────────────────────────────────
if [ "$VERSION" = "latest" ]; then
  TAG="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
    | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -1 || true)"
  [ -n "$TAG" ] || die "could not determine latest release from ${REPO}"
else
  TAG="v${VERSION#v}"
fi
VERSION="${TAG#v}"
BASE="https://github.com/${REPO}/releases/download/${TAG}"

if [ "$os" = windows ]; then
  ARCHIVE="lf_${VERSION}_${os}_${arch}.zip"
else
  ARCHIVE="lf_${VERSION}_${os}_${arch}.tar.gz"
fi
[ "$os" != windows ] || command -v unzip >/dev/null 2>&1 || die "'unzip' is required for Windows installs"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

say "Downloading ${APP} ${VERSION} (${os}/${arch})…"
if [ -t 1 ]; then
  curl -# -fSL "${BASE}/${ARCHIVE}" -o "${TMP}/${ARCHIVE}"
else
  curl -fSL "${BASE}/${ARCHIVE}" -o "${TMP}/${ARCHIVE}"
fi

# ── Verify SHA-256 against checksums.txt ───────────────────────────────────
if command -v sha256sum >/dev/null 2>&1; then
  HASH="sha256sum"
elif command -v shasum >/dev/null 2>&1; then
  HASH="shasum -a 256"
else
  HASH=""
fi
if [ -n "$HASH" ]; then
  curl -fsSL -o "$TMP/checksums.txt" "${BASE}/checksums.txt"
  EXPECTED="$(awk -v a="$ARCHIVE" '$2==a {print $1}' "$TMP/checksums.txt")"
  [ -n "$EXPECTED" ] || die "no checksum listed for ${ARCHIVE}"
  GOT="$($HASH "$TMP/$ARCHIVE" | awk '{print $1}')"
  [ "$EXPECTED" = "$GOT" ] || die "checksum mismatch for ${ARCHIVE}"
  good "Checksum verified."
else
  warn "No sha256 tool found — skipping checksum verification."
fi

# ── Install ─────────────────────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR"
if [ "$os" = windows ]; then
  unzip -oq "$TMP/$ARCHIVE" -d "$TMP"
  install -m 0755 "$TMP/lf.exe" "$INSTALL_DIR/lf.exe"
  cp -f "$INSTALL_DIR/lf.exe" "$INSTALL_DIR/$ALIAS.exe"
else
  tar -xzf "$TMP/$ARCHIVE" -C "$TMP"
  install -m 0755 "$TMP/lf" "$INSTALL_DIR/$APP"
  ln -sf "$APP" "$INSTALL_DIR/$ALIAS"
fi

good "Installed ${APP} ${VERSION} → ${INSTALL_DIR}"

if [ "$os" != windows ]; then
  "$INSTALL_DIR/lf" --version >/dev/null 2>&1 \
    || "$INSTALL_DIR/lf" version >/dev/null 2>&1 \
    || die "installed binary failed to run"
fi

# ── Add to PATH ────────────────────────────────────────────────────────────
add_to_path() {
  local file="$1" line="$2"
  grep -Fxq "$line" "$file" 2>/dev/null && return
  printf '\n# layerflow\n%s\n' "$line" >> "$file"
  good "Added ${INSTALL_DIR} to PATH in ${file}"
}

if [ "$no_modify_path" = "false" ] && [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  case "$(basename "${SHELL:-}")" in
    fish) add_to_path "$HOME/.config/fish/config.fish" "fish_add_path $INSTALL_DIR" ;;
    zsh)  add_to_path "${ZDOTDIR:-$HOME}/.zshrc" "export PATH=\"$INSTALL_DIR:\$PATH\"" ;;
    *)    add_to_path "$HOME/.bashrc" "export PATH=\"$INSTALL_DIR:\$PATH\"" ;;
  esac
fi

printf '\n'
if [[ ":$PATH:" == *":$INSTALL_DIR:"* ]] || [ "$no_modify_path" = "true" ]; then
  say "Run  lf  to start the terminal.  ($APP version to confirm, $APP login to get started)"
else
  say "Restart your terminal, or run:  source ~/.zshrc  (or ~/.bashrc)"
  say "Then run:  lf"
fi