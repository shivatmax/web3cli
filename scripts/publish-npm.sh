#!/bin/bash
# Script to publish the @web3ai/cli package to npm

# Make sure we're in the project root
cd "$(dirname "$0")/.."

# Clean up previous builds
rm -rf dist

# Install dependencies (if needed)
echo "Installing dependencies..."
pnpm install

# Run build process
echo "Building package..."
pnpm build

# Publish package
echo "Publishing package to npm..."
npm publish --access public

echo "Package published successfully!"
echo "You can now install it with: npm install -g @web3ai/cli" 