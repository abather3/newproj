#!/bin/bash
set -e

echo "🚀 Setting up frontend for Railway deployment..."

# Copy frontend package.json to root (overwrite the workspace one)
cp frontend/package.json package.json
cp frontend/package-lock.json package-lock.json

# Copy essential directories
cp -r frontend/src src
cp -r frontend/public public

# Copy environment and config files
cp frontend/.env.production .env.production 2>/dev/null || true

echo "✅ Frontend structure ready for Railway build"
echo "📦 Installing dependencies..."

# Install dependencies
npm ci

echo "🔨 Building React application..."

# Build the app
npm run build

echo "✅ Build completed successfully!"
