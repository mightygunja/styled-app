#!/bin/bash

# Styled App Build Script
# Usage: ./scripts/build.sh [development|preview|production]

set -e

PROFILE=${1:-development}

echo "🚀 Building Styled App - Profile: $PROFILE"
echo "================================================"

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Navigate to app directory
cd "$(dirname "$0")/.."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run type check
echo "🔍 Running TypeScript check..."
npx tsc --noEmit || echo "⚠️  TypeScript warnings found (continuing...)"

# Build for iOS
echo "📱 Building for iOS..."
eas build --platform ios --profile $PROFILE --non-interactive

# Build for Android
echo "🤖 Building for Android..."
eas build --platform android --profile $PROFILE --non-interactive

echo "✅ Build complete!"
echo "================================================"
echo "Next steps:"
echo "1. Check build status: eas build:list"
echo "2. Download builds: eas build:download"
echo "3. Submit to stores: eas submit"
