#!/usr/bin/env bash
set -e # Exit immediately if any command fails

echo "Building Bulk File Renamer..."
cd "Awesome Websites/Bulk File Renamer"
npm ci
npm run build
cd ../..

echo "Building Gitmoji Helper..."
cd "Awesome Websites/Gitmoji-Helper"
pnpm i
pnpm run build
cd ../..

echo "All builds finished successfully!"