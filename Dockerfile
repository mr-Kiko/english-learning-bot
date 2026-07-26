FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/
COPY server/ ./server/
COPY utils/ ./
COPY *.ts ./
COPY public/ ./public/
COPY data/words-raw.json ./data/words-raw.json

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Create data directory
RUN mkdir -p data

EXPOSE 3000

CMD ["sh", "-c", "npm run migrate && npm run seed && node dist/index.js"]
