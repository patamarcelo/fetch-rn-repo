#!/bin/sh

set -e

echo "Restaurando scripts do Xcode Cloud..."

mkdir -p ios/ci_scripts

cp .xcode-cloud/ci_post_clone.sh ios/ci_scripts/ci_post_clone.sh
chmod +x ios/ci_scripts/ci_post_clone.sh

echo "Scripts do Xcode Cloud restaurados com sucesso."
