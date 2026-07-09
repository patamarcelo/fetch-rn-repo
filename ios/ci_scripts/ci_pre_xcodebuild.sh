#!/bin/sh

set -e

echo "===== Xcode Cloud pre xcodebuild started ====="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../.."

echo "Repository root:"
pwd

echo "Checking Node..."
which node || true
node -v || true

echo "Checking NPM..."
which npm || true
npm -v || true

echo "Installing JS dependencies..."

if command -v npm >/dev/null 2>&1; then
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi
else
  echo "ERROR: npm not found in Xcode Cloud environment."
  exit 1
fi

echo "Installing CocoaPods..."

cd ios
pod install

echo "Checking Pods xcconfig..."

if [ -f "Pods/Target Support Files/Pods-FarmAplicaes/Pods-FarmAplicaes.release.xcconfig" ]; then
  echo "Pods xcconfig found."
else
  echo "ERROR: Pods xcconfig not found after pod install."
  exit 1
fi

echo "===== Xcode Cloud pre xcodebuild finished ====="
