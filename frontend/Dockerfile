# Use Node.js 20 as the base image
FROM node:20

# Set the working directory
WORKDIR /app

# Copy the entire repo content
COPY . .

# Set working directory to frontend
WORKDIR /app/frontend

# Install dependencies
RUN npm install

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Run the app using a static server
CMD [ "npx", "serve", "-s", "build", "-l", "3000" ]
