# Use Node.js 18 LTS on Alpine Linux
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
# Note: We are ignoring scripts to avoid running any pre-install scripts that might fail
# in a minimal environment, though for this project it should be fine.
RUN npm install --omit=dev

# Copy the rest of the backend code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Define environment variables (can be overridden at runtime)
# Default to production settings
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["node", "server.js"]
