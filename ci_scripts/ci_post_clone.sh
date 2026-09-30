#!/bin/sh

set -e

echo "===== XCODE CLOUD: POST CLONE ====="
echo "PWD inicial: $(pwd)"
echo "CI_PRIMARY_REPOSITORY_PATH: $CI_PRIMARY_REPOSITORY_PATH"

REPOSITORY_PATH="${CI_PRIMARY_REPOSITORY_PATH:-$(pwd)}"

echo "===== ENTRANDO NO APP ====="
cd "$REPOSITORY_PATH"

echo "PWD atual: $(pwd)"

echo "===== CONFIGURANDO NODE ====="

NODE_VERSION="20.19.4"

case "$(uname -m)" in
  arm64)
    NODE_ARCH="arm64"
    ;;
  x86_64)
    NODE_ARCH="x64"
    ;;
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

echo "Node:"
node -v

echo "npm:"
npm -v

echo "===== INSTALANDO DEPENDÊNCIAS JS ====="

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "===== VERIFICANDO COCOAPODS ====="

if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods não está disponível no Xcode Cloud."
  exit 1
fi

echo "CocoaPods:"
pod --version

echo "===== INSTALANDO PODS ====="

cd ios

MAX_ATTEMPTS=4
ATTEMPT=1

while [ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]; do
  echo "===== POD INSTALL: tentativa $ATTEMPT de $MAX_ATTEMPTS ====="

  if pod install; then
    echo "===== POD INSTALL CONCLUÍDO ====="
    break
  fi

  if [ "$ATTEMPT" -eq "$MAX_ATTEMPTS" ]; then
    echo "===== POD INSTALL FALHOU APÓS $MAX_ATTEMPTS TENTATIVAS ====="
    exit 1
  fi

  WAIT_SECONDS=$((ATTEMPT * 60))

  echo "pod install falhou. Aguardando ${WAIT_SECONDS}s..."
  sleep "$WAIT_SECONDS"

  ATTEMPT=$((ATTEMPT + 1))
done

echo "===== VALIDANDO PODS ====="

XCCONFIG_PATH="Pods/Target Support Files/Pods-FarmAplicaes/Pods-FarmAplicaes.release.xcconfig"

if [ ! -f "$XCCONFIG_PATH" ]; then
  echo "Arquivo xcconfig não foi criado: $XCCONFIG_PATH"
  exit 1
fi

echo "===== POST CLONE FINALIZADO ====="