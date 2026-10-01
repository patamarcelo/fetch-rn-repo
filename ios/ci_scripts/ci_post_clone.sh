#!/bin/sh

set -e

echo "=================================================="
echo "Xcode Cloud - ci_post_clone"
echo "=================================================="

REPOSITORY_PATH="${CI_PRIMARY_REPOSITORY_PATH:-$(pwd)}"

echo "Repositório:"
echo "${REPOSITORY_PATH}"

cd "${REPOSITORY_PATH}"

echo ""
echo "Diretório atual:"
pwd

echo ""
echo "Configurando PATH..."

export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:${PATH}"

echo ""
echo "Verificando Node.js..."

if command -v node >/dev/null 2>&1; then
    echo "Node.js encontrado:"
    node --version
else
    echo "Node.js não encontrado no PATH."

    echo ""
    echo "Instalando NVM..."

    export NVM_DIR="${HOME}/.nvm"

    mkdir -p "${NVM_DIR}"

    curl -o- \
        https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh \
        | bash

    # shellcheck disable=SC1090
    . "${NVM_DIR}/nvm.sh"

    echo ""
    echo "Instalando Node 22..."

    nvm install 22
    nvm use 22
fi

echo ""
echo "Validando Node.js..."

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
NODE_MINOR="$(node -p "process.versions.node.split('.')[1]")"

echo "Node:"
node --version

if [ "${NODE_MAJOR}" -lt 22 ]; then
    echo "ERRO: Node.js incompatível."
    echo "Expo SDK 57 requer Node 22.13.x ou superior."
    exit 1
fi

if [ "${NODE_MAJOR}" -eq 22 ] && [ "${NODE_MINOR}" -lt 13 ]; then
    echo "ERRO: Node.js incompatível."
    echo "Expo SDK 57 requer Node 22.13.x ou superior."
    exit 1
fi

echo ""
echo "NPM:"
npm --version

echo ""
echo "Verificando CocoaPods..."

if ! command -v pod >/dev/null 2>&1; then
    echo "ERRO: CocoaPods não encontrado."
    echo "O Xcode Cloud deveria fornecer CocoaPods."
    exit 1
fi

echo "CocoaPods:"
pod --version

echo ""
echo "Instalando dependências JavaScript..."

cd "${REPOSITORY_PATH}"

if [ -f "package-lock.json" ]; then
    echo "package-lock.json encontrado."
    echo "Executando npm ci..."

    npm ci --legacy-peer-deps

elif [ -f "yarn.lock" ]; then
    echo "yarn.lock encontrado."

    if ! command -v yarn >/dev/null 2>&1; then
        echo "Yarn não encontrado. Instalando..."
        npm install --global yarn
    fi

    yarn install --frozen-lockfile

else
    echo "Nenhum lockfile encontrado."
    echo "Executando npm install..."

    npm install --legacy-peer-deps
fi

echo ""
echo "Instalando Pods..."

cd "${REPOSITORY_PATH}/ios"

pod install --repo-update

echo ""
echo "Verificando integração do CocoaPods..."

XCCONFIG_PATH="Pods/Target Support Files/Pods-FarmAplicaes/Pods-FarmAplicaes.release.xcconfig"

if [ ! -f "${XCCONFIG_PATH}" ]; then
    echo "ERRO: o arquivo esperado não foi criado:"
    echo "${XCCONFIG_PATH}"

    echo ""
    echo "Arquivos xcconfig encontrados:"

    find "Pods/Target Support Files" \
        -type f \
        -name "*.xcconfig" \
        -print 2>/dev/null || true

    exit 1
fi

echo ""
echo "Arquivo encontrado:"
echo "${XCCONFIG_PATH}"

echo ""
echo "=================================================="
echo "ci_post_clone concluído com sucesso"
echo "=================================================="