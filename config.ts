import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  bot: {
    token: process.env.BOT_TOKEN || '',
    adminIds: (process.env.ADMIN_IDS || '').split(',').filter(Boolean).map(Number),
    webappUrl: process.env.BOT_WEBAPP_URL || 'http://localhost:3000',
  },
  webapp: {
    url: process.env.WEBAPP_URL || 'http://localhost:3000',
  },
  database: {
    path: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'bot.db'),
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '20'),
  },
  learning: {
    defaultDailyWordsTarget: 10,
    newWordsPerLesson: 20,
    maxMasteryLevel: 5,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
  },
};

export function validateConfig(): void {
  if (!config.bot.token) {
    throw new Error('BOT_TOKEN is required. Set it in .env file.');
  }
}
