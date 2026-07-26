import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config';
import { runMigrations } from './src/database/migrate';
import { runSeed } from './src/database/seed';
import { setupBot } from './bot';
import logger from './src/utils/logger';
import apiRoutes from './server/routes/api';

const app = express();
const PORT = config.server.port;

// Security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: config.server.nodeEnv === 'production'
    ? [config.webapp.url, config.bot.webappUrl]
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files - serve Mini App
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve Mini App for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize
async function init() {
  try {
    logger.info('Initializing English Learning Mini App...');

    // Run migrations and seed
    runMigrations();
    runSeed();

    // Start the bot
    const bot = await setupBot();
    logger.info('Telegram bot started');

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Mini App available at http://localhost:${PORT}`);
      logger.info(`API available at http://localhost:${PORT}/api`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      bot.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down...');
      bot.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to initialize:', error);
    process.exit(1);
  }
}

init();
