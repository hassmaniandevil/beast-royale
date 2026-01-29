FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/

# Install dependencies
RUN npm install

# Copy source code
COPY shared ./shared
COPY server ./server
COPY tsconfig.base.json ./

# Build shared first, then server
RUN npm run build --workspace=shared
RUN npm run build --workspace=server

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "server/dist/index.js"]
