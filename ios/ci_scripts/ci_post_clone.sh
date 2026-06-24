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
echo "Configurando Homebrew no PATH..."

if [ -x "/opt/homebrew/bin/brew" ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -x "/usr/local/bin/brew" ]; then
    eval "$(/usr/local/bin/brew shellenv)"
elif command -v brew >/dev/null 2>&1; then
    eval "$(brew shellenv)"
else
    echo "ERRO: Homebrew não está disponível no ambiente."
    exit 1
fi

echo ""
echo "Homebrew encontrado:"
command -v brew
brew --version

echo ""
echo "Verificando Node.js..."

if ! command -v node >/dev/null 2>&1; then
    echo "Node.js não encontrado. Instalando..."
    brew install node
else
    echo "Node.js já está instalado."
fi

echo ""
echo "Verificando CocoaPods..."

if ! command -v pod >/dev/null 2>&1; then
    echo "CocoaPods não encontrado. Instalando..."
    brew install cocoapods
else
    echo "CocoaPods já está instalado."
fi

echo ""
echo "Atualizando PATH após as instalações..."

export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:${PATH}"

echo ""
echo "Versões disponíveis:"

echo "Node:"
node --version

echo "NPM:"
npm --version

echo "CocoaPods:"
pod --version

echo ""
echo "Instalando dependências JavaScript..."

cd "${REPOSITORY_PATH}"

if [ -f "package-lock.json" ]; then
    echo "package-lock.json encontrado. Executando npm ci..."
    npm ci
elif [ -f "yarn.lock" ]; then
    echo "yarn.lock encontrado."

    if ! command -v yarn >/dev/null 2>&1; then
        echo "Yarn não encontrado. Instalando..."
        npm install --global yarn
    fi

    yarn install --frozen-lockfile
else
    echo "Nenhum lockfile encontrado. Executando npm install..."
    npm install
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
