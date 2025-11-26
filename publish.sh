#!/bin/bash

set -e

echo "🔍 Checking for hardcoded version..."
if grep -q "\.version('[0-9]" src/cli.ts; then
  echo "❌ Error: Hardcoded version found in src/cli.ts"
  echo "   Use .version(packageJson.version) instead"
  exit 1
fi

echo "🔍 Running tests..."
npm test

echo "🏗️  Building package..."
npm run build

echo "🧪 Testing built CLI..."
node dist/cli.js --version

echo "✅ Validating package..."
npm publish --dry-run

echo "📦 Publishing to npm..."
npm publish

echo "🏷️  Creating git tag..."
VERSION=$(node -p "require('./package.json').version")
git tag "v$VERSION"
git push origin "v$VERSION"

echo "✨ Published synapse@$VERSION successfully!"
