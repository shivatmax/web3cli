#!/bin/bash
# Script to publish the @web3ai/cli package to npm

# Make sure we're in the project root
cd "$(dirname "$0")/.."

# Clean up previous builds
rm -rf dist

# Install dependencies (if needed)
echo "Installing dependencies..."
npm install

# Run build process
echo "Building package..."
npm run build

# Publish package
echo "Publishing package to npm..."
npm publish --access public

echo "Package published successfully!"
echo "You can now install it with: npm install -g @web3ai/cli" 