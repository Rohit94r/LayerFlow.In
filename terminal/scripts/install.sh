#!/usr/bin/env bash
#
# LayerFlow Terminal (lf) — one-liner installer.
#
#   curl -fsSL https://raw.githubusercontent.com/Rohit94r/LayerFlow.In/main/terminal/scripts/install.sh | bash
#
# Downloads the latest lf release tarball from the public binary repo,
# verifies its SHA-256 against checksums.txt, and installs it.
#
# Customization:
#   LF_VERSION=x.y.z   pin a specific version (default: latest)
#   LF_INSTALL_DIR=PATH  install dir (default: ~/.local/bin)

set -euo pipefail

REPO="Rohit94r/layerflow-releases"
INSTALL_DIR="${LF_INSTALL_DIR:-$HOME/.local/bin}"
VERSION="${LF_VERSION:-}"

say() { printf '\033[1;32m[layerflow]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[layerflow] error:\033[0m %s\n' "$*" >&2; exit 1; }

[ -n "$VERSION" ] || VERSION="$(
  curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
    | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -1
)"
[ -n "$VERSION" ] || die "could not determine latest version from ${REPO}"

case "$(uname -s)" in
  Darwin) OS=darwin ;;
  Linux)  OS=linux ;;
  *) die "unsupported OS: $(uname -s) (only macOS and Linux supported)" ;;
esac

case "$(uname -m)" in
  x86_64|amd64)  ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) die "unsupported architecture: $(uname -m)" ;;
esac

EXT=tar.gz

BASE="https://github.com/${REPO}/releases/download/${VERSION}"
ARTIFACT="lf_${VERSION#v}_${OS}_${ARCH}.${EXT}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

say "Downloading ${ARTIFACT} (${VERSION})…"
curl -fsSL -o "$TMP/$ARTIFACT" "$BASE/$ARTIFACT"

if command -v sha256sum >/dev/null 2>&1; then
  HASH="sha256sum"
elif command -v shasum >/dev/null 2>&1; then
  HASH="shasum -a 256"
else
  HASH=""
fi
if [ -n "$HASH" ]; then
  curl -fsSL -o "$TMP/checksums.txt" "$BASE/checksums.txt"
  EXPECTED="$(awk -v a="$ARTIFACT" '$2==a {print $1}' "$TMP/checksums.txt")"
  [ -n "$EXPECTED" ] || die "no checksum listed for ${ARTIFACT}"
  GOT="$($HASH "$TMP/$ARTIFACT" | awk '{print $1}')"
  if [ "$EXPECTED" = "$GOT" ]; then
    say "Checksum verified."
  else
    die "checksum mismatch for ${ARTIFACT} (expected ${EXPECTED}, got ${GOT})"
  fi
else
  say "No sha256 tool found — skipping checksum verification."
fi

case "$EXT" in
  tar.gz) tar -xzf "$TMP/$ARTIFACT" -C "$TMP" ;;
  zip) (command -v unzip >/dev/null 2>&1 && unzip -oq "$TMP/$ARTIFACT" -d "$TMP") || die "unzip required for .zip" ;;
esac
[ -f "$TMP/lf" ] || die "binary not found inside $ARTIFACT"

mkdir -p "$INSTALL_DIR"
install -m 0755 "$TMP/lf" "$INSTALL_DIR/lf"
ln -sf "$INSTALL_DIR/lf" "$INSTALL_DIR/layerflow"

if ! "$INSTALL_DIR/lf" --version >/dev/null 2>&1 && ! "$INSTALL_DIR/lf" version >/dev/null 2>&1; then
  die "installed binary failed to run"
fi

printf '\n'
say "Installed lf ${VERSION} → ${INSTALL_DIR}/lf (alias: layerflow)"
if ! command -v lf >/dev/null 2>&1 && [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  say "Add it to your PATH:  export PATH=\"\$PATH:${INSTALL_DIR}\""
fi
say "Run  lf  to start the terminal."