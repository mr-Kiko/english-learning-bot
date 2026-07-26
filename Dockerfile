FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Build
RUN npx tsc

EXPOSE 3000

CMD ["node", "dist/index.js"]
