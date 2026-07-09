#!/bin/sh

set -e

echo "Installing JS dependencies..."

if [ -f yarn.lock ]; then
  yarn install --frozen-lockfile
else
  npm ci
fi

echo "Installing CocoaPods dependencies..."

cd ios
pod install
