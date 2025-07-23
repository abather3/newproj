#!/bin/bash
# Start script for Railway deployment
set -e

echo "Starting frontend server..."

# Install serve if not available
if ! command -v serve &> /dev/null; then
    echo "Installing serve..."
    npm install -g serve
fi

# Start the server
echo "Serving React build on port 3000..."
serve -s build -l 3000
