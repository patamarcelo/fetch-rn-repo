#!/bin/sh

set -e

echo "===== XCODE CLOUD: PRE XCODEBUILD ====="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPOSITORY_PATH="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPOSITORY_PATH"

echo "Repository root:"
pwd

echo "===== CONFIGURANDO NODE ====="

NODE_VERSION="20.19.4"

case "$(uname -m)" in
  arm64) NODE_ARCH="arm64" ;;
  x86_64) NODE_ARCH="x64" ;;
  *)
    echo "Arquitetura não suportada: $(uname -m)"
    exit 1
    ;;
esac

NODE_BASENAME="node-v${NODE_VERSION}-darwin-${NODE_ARCH}"
NODE_DIRECTORY="${CI_DERIVED_DATA_PATH:-/tmp}/node"
NODE_INSTALL_PATH="${NODE_DIRECTORY}/${NODE_BASENAME}"
NODE_ARCHIVE="/tmp/${NODE_BASENAME}.tar.gz"

if [ ! -x "${NODE_INSTALL_PATH}/bin/node" ]; then
  echo "Baixando Node ${NODE_VERSION} para macOS ${NODE_ARCH}..."
  mkdir -p "$NODE_DIRECTORY"
  curl \
    --fail \
    --location \
    --retry 3 \
    --silent \
    --show-error \
    "https://nodejs.org/dist/v${NODE_VERSION}/${NODE_BASENAME}.tar.gz" \
    -o "$NODE_ARCHIVE"
  tar -xzf "$NODE_ARCHIVE" -C "$NODE_DIRECTORY"
  rm -f "$NODE_ARCHIVE"
fi

export PATH="${NODE_INSTALL_PATH}/bin:${PATH}"

echo "Node: $(node -v)"
echo "npm: $(npm -v)"

echo "===== INSTALANDO DEPENDÊNCIAS JS ====="
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "===== INSTALANDO PODS ====="

if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods não está disponível no Xcode Cloud."
  exit 1
fi

cd ios
pod install

XCCONFIG_PATH="Pods/Target Support Files/Pods-FarmAplicaes/Pods-FarmAplicaes.release.xcconfig"
if [ ! -f "$XCCONFIG_PATH" ]; then
  echo "Pods xcconfig não encontrado: $XCCONFIG_PATH"
  exit 1
fi

echo "===== PRE XCODEBUILD FINALIZADO ====="
