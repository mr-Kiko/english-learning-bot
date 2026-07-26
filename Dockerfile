FROM node:18-alpine

WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/
COPY server/ ./server/
COPY utils/ ./
COPY *.ts ./
COPY public/ ./public/
COPY data/words-raw.json ./data/words-raw.json

# Build TypeScript
RUN npx tsc

# Create data directory
RUN mkdir -p data

EXPOSE 3000

CMD ["sh", "-c", "node dist/index.js"]
