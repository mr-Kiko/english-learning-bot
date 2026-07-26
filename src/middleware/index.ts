import { Context, Middleware } from 'telegraf';
import { config } from '../config';
import { UserRepository } from '../database/repository';
import logger from '../utils/logger';

const userRequests = new Map<number, number[]>();

export const rateLimiter: Middleware<Context> = async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();

  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  const maxRequests = config.rateLimit.maxRequests;

  const timestamps = userRequests.get(userId) || [];
  const recentTimestamps = timestamps.filter(t => now - t < windowMs);

  if (recentTimestamps.length >= maxRequests) {
    await ctx.reply('⚠️ لطفاً کمی صبر کنید. درخواست‌های زیادی ارسال کرده‌اید.');
    return;
  }

  recentTimestamps.push(now);
  userRequests.set(userId, recentTimestamps);

  return next();
};

export const userTracker: Middleware<Context> = async (ctx, next) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return next();

  const userRepo = new UserRepository();
  let user = userRepo.findByTelegramId(telegramId);

  if (!user) {
    user = userRepo.create(
      telegramId,
      ctx.from?.username || null,
      ctx.from?.first_name || null,
      ctx.from?.last_name || null
    );
    logger.info(`New user registered: ${telegramId} (${ctx.from?.first_name})`);
  }

  userRepo.updateStreak(user.id);
  (ctx as any).dbUser = user;

  return next();
};
