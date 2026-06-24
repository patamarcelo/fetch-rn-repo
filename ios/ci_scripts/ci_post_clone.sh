#!/bin/sh

set -e

echo "========================================"
echo "Xcode Cloud - ci_post_clone"
echo "Repositório: ${CI_PRIMARY_REPOSITORY_PATH}"
echo "========================================"

cd "${CI_PRIMARY_REPOSITORY_PATH}"

echo ""
echo "Diretório atual:"
pwd

echo ""
echo "Versões disponíveis:"
node --version
npm --version
ruby --version

echo ""
echo "Instalando dependências JavaScript..."

if [ -f "package-lock.json" ]; then
    npm ci
elif [ -f "yarn.lock" ]; then
    corepack enable
    yarn install --frozen-lockfile
else
    npm install
fi

echo ""
echo "Entrando na pasta ios..."
cd "${CI_PRIMARY_REPOSITORY_PATH}/ios"

echo ""
echo "Verificando CocoaPods..."

if ! command -v pod >/dev/null 2>&1; then
    echo "CocoaPods não encontrado. Instalando com Homebrew..."
    brew install cocoapods
fi

echo ""
echo "Versão do CocoaPods:"
pod --version

echo ""
echo "Instalando Pods..."
pod install --repo-update

echo ""
echo "Verificando arquivo de configuração gerado..."

XCCONFIG_PATH="Pods/Target Support Files/Pods-FarmAplicaes/Pods-FarmAplicaes.release.xcconfig"

if [ ! -f "${XCCONFIG_PATH}" ]; then
    echo "ERRO: arquivo não encontrado:"
    echo "${XCCONFIG_PATH}"

    echo ""
    echo "Pastas existentes em Pods/Target Support Files:"
    find "Pods/Target Support Files" -maxdepth 2 -type f -name "*.xcconfig" 2>/dev/null || true

    exit 1
fi

echo "Arquivo encontrado:"
echo "${XCCONFIG_PATH}"

echo ""
echo "Instalação concluída com sucesso."
