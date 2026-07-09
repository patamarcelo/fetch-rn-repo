#!/bin/sh

set -e

echo "===== Xcode Cloud post clone started ====="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "iOS directory:"
pwd

echo "Running pod install only..."
pod install

echo "Checking Pods config..."

if [ -f "Pods/Target Support Files/Pods-FarmAplicaes/Pods-FarmAplicaes.release.xcconfig" ]; then
  echo "Pods xcconfig found."
else
  echo "ERROR: Pods xcconfig not found after pod install."
  exit 1
fi

echo "===== Xcode Cloud post clone finished ====="
