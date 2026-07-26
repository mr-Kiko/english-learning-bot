FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy built files and data
COPY dist/ ./dist/
COPY public/ ./public/
COPY data/ ./data/
COPY .env ./.env

# Create data directory
RUN mkdir -p data

EXPOSE 3000

CMD ["node", "dist/index.js"]
