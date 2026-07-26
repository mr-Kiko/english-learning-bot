import { Context, Markup } from 'telegraf';
import { UserRepository, WordRepository } from '../../database/repository';
import { config } from '../../config';
import { Word } from '../../types';
import logger from '../../utils/logger';

const userRepo = new UserRepository();
const wordRepo = new WordRepository();

function isAdmin(telegramId: number): boolean {
  return config.bot.adminIds.includes(telegramId);
}

export async function handleAdminCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId || !isAdmin(telegramId)) {
    await ctx.reply('⚠️ شما دسترسی ادمین ندارید.');
    return;
  }

  const users = userRepo.getAll();
  const wordCount = wordRepo.getCount();
  const lessons = wordRepo.getLessons();

  const msg = `🔧 **پنل مدیریت**

📊 **آمار کلی:**
• تعداد کاربران: ${users.length}
• تعداد واژگان: ${wordCount}
• تعداد درس‌ها: ${lessons.length}

⚙️ **عملیات:**

`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('👥 لیست کاربران', 'admin_users')],
    [Markup.button.callback('📖 مدیریت درس‌ها', 'admin_lessons')],
    [Markup.button.callback('➕ اضافه کردن واژه', 'admin_add_word')],
    [Markup.button.callback('📥 وارد کردن واژگان', 'admin_import')],
    [Markup.button.callback('📢 ارسال پیام همگانی', 'admin_announce')],
    [Markup.button.callback('🏠 منوی اصلی', 'back_to_menu')],
  ]);

  await ctx.reply(msg, { parse_mode: 'Markdown', ...keyboard });
}

export async function handleAdminCallback(ctx: Context, action: string): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId || !isAdmin(telegramId)) return;

  if (action === 'admin_users') {
    const users = userRepo.getAll();
    let msg = `👥 **لیست کاربران** (${users.length} نفر)\n\n`;

    users.slice(0, 20).forEach((u, i) => {
      msg += `${i + 1}. ${u.first_name || 'ناشناس'} (@${u.username || 'ندارد'}) - سطح ${u.current_level}\n`;
    });

    if (users.length > 20) {
      msg += `\n... و ${users.length - 20} کاربر دیگر`;
    }

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  }

  if (action === 'admin_lessons') {
    const lessons = wordRepo.getLessons();
    let msg = `📖 **لیست درس‌ها**\n\n`;

    lessons.forEach(l => {
      msg += `• واحد ${l.lesson}، درس ${l.lesson}: ${l.count} واژه\n`;
    });

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  }

  if (action === 'admin_add_word') {
    const msg = `➕ **اضافه کردن واژه جدید**

لطفاً اطلاعات واژه را با فرمت زیر ارسال کنید:

\`word | pronunciation | persian_meaning | english_definition | part_of_speech | example_sentence | example_persian | unit | lesson\`

مثال:
\`abandon | /əˈbændən/ | رها کردن | To leave permanently | verb | He abandoned his car. | او ماشینش را رها کرد. | 1 | 1\``;

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  }

  if (action === 'admin_import') {
    const msg = `📥 **وارد کردن واژگان**

فرمت فایل JSON:

\`\`\`json
[
  {
    "word": "example",
    "pronunciation": "/ɪɡˈzæmpəl/",
    "persian_meaning": "مثال",
    "english_definition": "A thing characteristic of its kind",
    "part_of_speech": "noun",
    "example_sentence": "This is an example.",
    "example_persian": "این یک مثال است.",
    "difficulty_level": 1,
    "unit": 1,
    "lesson": 1
  }
]
\`\`\`

فایل JSON را ارسال کنید.`;

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  }

  if (action === 'admin_announce') {
    const msg = `📢 **ارسال پیام همگانی**

لطفاً پیام خود را ارسال کنید تا برای تمام کاربران ارسال شود.`;

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  }
}

export async function handleAdminAddWord(ctx: Context, text: string): Promise<boolean> {
  const telegramId = ctx.from?.id;
  if (!telegramId || !isAdmin(telegramId)) return false;

  try {
    const parts = text.split('|').map(p => p.trim());
    if (parts.length < 9) {
      await ctx.reply('⚠️ فرمت نادرست. لطفاً دوباره تلاش کنید.');
      return true;
    }

    const newWord: Omit<Word, 'id'> = {
      word: parts[0],
      pronunciation: parts[1],
      persian_meaning: parts[2],
      english_definition: parts[3],
      part_of_speech: parts[4],
      example_sentence: parts[5],
      example_persian: parts[6],
      difficulty_level: parseInt(parts[7]) || 1,
      unit: parseInt(parts[8]) || 1,
      lesson: parseInt(parts[9]) || 1,
    };

    wordRepo.create(newWord);
    await ctx.reply(`✅ واژه "${newWord.word}" با موفقیت اضافه شد.`);
    return true;
  } catch (error) {
    logger.error('Error adding word:', error);
    await ctx.reply('❌ خطا در اضافه کردن واژه.');
    return true;
  }
}

export function isUserAdmin(telegramId: number): boolean {
  return isAdmin(telegramId);
}
