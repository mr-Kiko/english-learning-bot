import { Telegraf, Markup } from 'telegraf';
import { config } from './config';
import { UserRepository } from './src/database/repository';
import logger from './src/utils/logger';

const userRepo = new UserRepository();

export async function setupBot(): Promise<Telegraf> {
  const bot = new Telegraf(config.bot.token);

  // Initialize database user on /start
  bot.start((ctx) => {
    const telegramId = ctx.from.id;
    const user = userRepo.findByTelegramId(telegramId);

    if (!user) {
      userRepo.create(
        telegramId,
        ctx.from.username || null,
        ctx.from.first_name || null,
        ctx.from.last_name || null
      );
      logger.info(`New user: ${telegramId} (${ctx.from.first_name})`);
    }

    userRepo.updateStreak(user?.id || 0);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 شروع یادگیری', `${config.bot.webappUrl}`)],
    ]);

    ctx.reply(
      `🇬🇧 **به ربات یادگیری انگلیسی خوش آمدید!**\n\n📚 بر اساس کتاب **4000 Essential English Words**\n\nبرای شروع یادگیری، دکمه زیر را فشار دهید:`,
      { parse_mode: 'Markdown', ...keyboard }
    );
  });

  // Help command
  bot.help((ctx) => {
    ctx.reply(
      `📖 **راهنمای ربات**\n\n` +
      `🔹 /start - شروع مجدد ربات\n` +
      `🔹 /help - نمایش این راهنما\n\n` +
      `💡 اپلیکیشن کوچک تلگرام (Mini App) را باز کنید و شروع به یادگیری کنید!`,
      { parse_mode: 'Markdown' }
    );
  });

  // Launch bot
  bot.launch();
  logger.info('Bot launched successfully');

  return bot;
}
