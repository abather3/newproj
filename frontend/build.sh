#!/bin/bash
# Build script for Railway deployment
set -e

echo "Starting frontend build process..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the React app
echo "Building React application..."
npm run build

echo "Build completed successfully!"
