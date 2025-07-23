# Use Node.js 20
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy frontend package.json and setup
COPY frontend/package.json ./
COPY frontend/src ./src
COPY frontend/public ./public

# Install dependencies and serve package
RUN npm install

# Build the React app
RUN npm run build

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the application
CMD ["serve", "-s", "build", "-l", "3000"]
