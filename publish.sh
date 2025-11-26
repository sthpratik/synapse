#!/bin/bash

set -e

echo "🔍 Running tests..."
npm test

echo "🏗️  Building package..."
npm run build

echo "✅ Validating package..."
npm publish --dry-run

echo "📦 Publishing to npm..."
npm publish

echo "🏷️  Creating git tag..."
VERSION=$(node -p "require('./package.json').version")
git tag "v$VERSION"
git push origin "v$VERSION"

echo "✨ Published synapse@$VERSION successfully!"
