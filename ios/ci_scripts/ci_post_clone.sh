#!/bin/sh

set -e

echo "===== Xcode Cloud post clone started ====="

echo "Current directory:"
pwd

echo "Listing files:"
ls -la

echo "Going to repository root if needed..."

if [ -d "../ios" ]; then
  cd ..
fi

echo "Now at:"
pwd

echo "Installing JS dependencies..."

if [ -f yarn.lock ]; then
  yarn install --frozen-lockfile
elif [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "Installing CocoaPods dependencies..."

cd ios
pod install --repo-update

echo "Checking generated Pods config:"
ls -la "Pods/Target Support Files/Pods-FarmAplicaes" || true

echo "===== Xcode Cloud post clone finished ====="
