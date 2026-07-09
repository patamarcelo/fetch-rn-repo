#!/bin/sh

set -e

echo "===== Xcode Cloud post clone started ====="

echo "Script directory:"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "$SCRIPT_DIR"

echo "Going to repository root..."
cd "$SCRIPT_DIR/../.."

echo "Repository root:"
pwd

echo "Root files:"
ls -la

echo "Checking Node/NPM..."

if ! command -v node >/dev/null 2>&1; then
  echo "Node not found. Installing Node with Homebrew..."
  brew install node
fi

echo "Node version:"
node -v

echo "NPM version:"
npm -v

echo "Installing JS dependencies..."

if [ -f yarn.lock ]; then
  echo "yarn.lock found"

  if ! command -v yarn >/dev/null 2>&1; then
    echo "Yarn not found. Installing Yarn..."
    npm install -g yarn
  fi

  yarn install --frozen-lockfile
elif [ -f package-lock.json ]; then
  echo "package-lock.json found"
  npm ci
else
  echo "No lockfile found, running npm install"
  npm install
fi

echo "Installing CocoaPods dependencies..."

cd ios

echo "iOS directory:"
pwd
ls -la

pod install --repo-update

echo "Checking generated Pods config:"
ls -la "Pods/Target Support Files/Pods-FarmAplicaes" || true

echo "===== Xcode Cloud post clone finished ====="
