#!/bin/sh

set -e

echo "Rodando Expo prebuild clean..."
npx expo prebuild --clean "$@"

echo "Expo prebuild finalizado. Restaurando Xcode Cloud scripts..."
./scripts/restore-xcode-cloud-scripts.sh

echo "Prebuild clean concluído com scripts restaurados."
