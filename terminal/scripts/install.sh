#!/bin/bash
set -e

echo "Installing lf..."

VERSION="${1:-latest}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"

# Detect OS and arch
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

case "$OS" in
  darwin) OS="darwin" ;;
  linux) OS="linux" ;;
  *) echo "Unsupported OS: $OS"; exit 1 ;;
esac

# Download URL
if [ "$VERSION" = "latest" ]; then
  VERSION=$(curl -s https://api.github.com/repos/Rohit94r/LayerFlow.In/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
fi

URL="https://github.com/Rohit94r/LayerFlow.In/releases/download/${VERSION}/lf_${VERSION}_${OS}_${ARCH}.tar.gz"

echo "Downloading $URL..."

mkdir -p "$INSTALL_DIR"
curl -sL "$URL" | tar xz -C "$INSTALL_DIR" lf

chmod +x "$INSTALL_DIR/lf"

echo "Installed lf $VERSION to $INSTALL_DIR/lf"
echo "Add $INSTALL_DIR to your PATH if not already added."
