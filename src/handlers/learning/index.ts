import { Context, Markup } from 'telegraf';
import { UserRepository, ProgressRepository, QuizRepository, WordRepository } from '../../database/repository';
import logger from '../../utils/logger';

const userRepo = new UserRepository();
const progressRepo = new ProgressRepository();
const quizRepo = new QuizRepository();
const wordRepo = new WordRepository();

export function getMainMenu(): string {
  return `🇬🇧 **به ربات یادگیری انگلیسی خوش آمدید!**

📚 بر اساس کتاب **4000 Essential English Words**

لطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;
}

export function getMainKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📚 شروع یادگیری', 'start_learning')],
    [Markup.button.callback('📖 درس‌ها', 'lessons')],
    [Markup.button.callback('📝 مرور واژگان', 'vocab_review')],
    [Markup.button.callback('🎯 کوییز روزانه', 'daily_quiz')],
    [Markup.button.callback('📊 پیشرفت من', 'my_progress')],
    [Markup.button.callback('⚙️ تنظیمات', 'settings')],
  ]);
}

export async function sendMainMenu(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = userRepo.findByTelegramId(telegramId);
  if (!user) return;

  const stats = progressRepo.getUserStats(user.id);
  const lessons = wordRepo.getLessons();

  let msg = getMainMenu();
  msg += `\n\n👤 **سطح:** ${user.current_level}`;
  msg += `\n🔥 ** серия:** ${user.learning_streak} روز`;
  msg += `\n📖 **واژگان یادگرفته:** ${stats.totalLearned}`;
  msg += `\n🎯 **مرور امروز:** ${stats.dueToday} واژه`;

  if (lessons.length > 0) {
    const lastLesson = lessons[lessons.length - 1];
    msg += `\n📚 **مجموع درس‌ها:** ${lessons.length} درس (${lessons.reduce((s, l) => s + l.count, 0)} واژه)`;
  }

  await ctx.reply(msg, { parse_mode: 'Markdown', ...getMainKeyboard() });
}

export async function handleStart(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = userRepo.findByTelegramId(telegramId);
  if (!user) return;

  const welcomeMsg = `🎉 **خوش آمدید!**

من ربات یادگیری انگلیسی شما هستم.

با کمک این ربات می‌توانید:
📚 واژگان کتاب 4000 Essential English Words را یاد بگیرید
📝 با تمرین‌های مختلف تسلط خود را بسازید
🎯 کوییز روزانه بدهید و پیشرفت خود را بسنجید
🤖 از هوش مصنوعی برای توضیح گرامر استفاده کنید

بیایید شروع کنیم! 👇`;

  await ctx.reply(welcomeMsg, { parse_mode: 'Markdown', ...getMainKeyboard() });
}

export async function handleMyProgress(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = userRepo.findByTelegramId(telegramId);
  if (!user) return;

  const stats = progressRepo.getUserStats(user.id);
  const recentQuizzes = quizRepo.getRecentResults(user.id, 3);
  const bestScore = quizRepo.getBestScore(user.id);

  let msg = `📊 **گزارش پیشرفت شما**

👤 **اطلاعات کاربری:**
• سطح فعلی: ${user.current_level}
• واحد فعلی: ${user.current_unit} - درس ${user.current_lesson}
• серия یادگیری: ${user.learning_streak} روز 🔥

📖 **واژگان:**
• تعداد کل یادگرفته: ${stats.totalLearned}
• تسلط کامل: ${stats.masteredCount}
• میانگین تسلط: ${(stats.avgMastery * 20).toFixed(0)}%
• در انتظار مرور: ${stats.dueToday}

🎯 **کوییز:**

`;
  if (recentQuizzes.length > 0) {
    msg += `• بهترین نمره: ${bestScore.toFixed(0)}%\n`;
    recentQuizzes.forEach((q, i) => {
      msg += `• ${q.quiz_date}: ${q.correct_answers}/${q.total_questions} (${q.score.toFixed(0)}%)\n`;
    });
  } else {
    msg += `• هنوز کوییزی نداده‌اید\n`;
  }

  await ctx.reply(msg, { parse_mode: 'Markdown', ...getMainKeyboard() });
}

export async function handleCallback(ctx: Context, action: string): Promise<void> {
  const data = JSON.parse(action);

  switch (data.action) {
    case 'back_to_menu':
      await sendMainMenu(ctx);
      break;
    case 'start_learning':
      await handleStartLearning(ctx);
      break;
    case 'daily_quiz':
      await handleDailyQuizStart(ctx);
      break;
    case 'vocab_review':
      await handleVocabReview(ctx);
      break;
  }
}

async function handleStartLearning(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = userRepo.findByTelegramId(telegramId);
  if (!user) return;

  const dueWords = progressRepo.getDueWords(user.id, 10);

  if (dueWords.length > 0) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(`🔄 مرور ${dueWords.length} واژه`, 'start_review')],
      [Markup.button.callback('📚 درس جدید', 'start_new_lesson')],
      [Markup.button.callback('🏠 منوی اصلی', 'back_to_menu')],
    ]);

    await ctx.reply(
      `📖 **مرور یا درس جدید؟**

شما ${dueWords.length} واژه برای مرور دارید.

.`,
      { parse_mode: 'Markdown', ...keyboard }
    );
  } else {
    await handleStartLesson(ctx);
  }
}

async function handleStartLesson(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = userRepo.findByTelegramId(telegramId);
  if (!user) return;

  const words = progressRepo.getNewWordsForLesson(user.id, user.current_unit, user.current_lesson, 10);

  if (words.length === 0) {
    // Move to next lesson
    const allWords = wordRepo.findByUnitAndLesson(user.current_unit, user.current_lesson);
    if (allWords.length === 0) {
      // Move to next unit
      userRepo.update(user.id, { current_unit: user.current_unit + 1, current_lesson: 1 });
    } else {
      userRepo.update(user.id, { current_lesson: user.current_lesson + 1 });
    }

    const newWords = progressRepo.getNewWordsForLesson(user.id, user.current_unit, user.current_lesson, 10);
    if (newWords.length === 0) {
      await ctx.reply('🎉 تبریک! شما تمام درس‌ها را به اتمام رسانده‌اید!', { parse_mode: 'Markdown' });
      await sendMainMenu(ctx);
      return;
    }

    await startWordCard(ctx, newWords, 0);
  } else {
    await startWordCard(ctx, words, 0);
  }
}

async function startWordCard(ctx: Context, words: any[], index: number): Promise<void> {
  if (index >= words.length) {
    await ctx.reply('✅ **آفرین! تمام واژگان این درس را یاد گرفتید!**', { parse_mode: 'Markdown' });
    await sendMainMenu(ctx);
    return;
  }

  const word = words[index];
  const progress = ((index + 1) / words.length * 100).toFixed(0);

  const msg = `📚 **درس ${word.unit}-${word.lesson}** (${progress}%)

━━━━━━━━━━━━━━━━━━━━━━━

🔤 **${word.word}**

📝 تلفظ: \`${word.pronunciation}\`

🇮🇷 معنی: **${word.persian_meaning}**

📖 تعریف: ${word.english_definition}

💬 مثال: ${word.example_sentence}
📝 ترجمه: ${word.example_persian}

━━━━━━━━━━━━━━━━━━━━━━━

${index + 1}/${words.length} واژه`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ یاد گرفتم', `learned_${word.id}`),
      Markup.button.callback('🔊 تلفظ', `pronounce_${word.id}`),
    ],
    [
      Markup.button.callback('📝 تمرین', `practice_${word.id}`),
      Markup.button.callback('💡 توضیح بیشتر', `explain_${word.id}`),
    ],
    [
      Markup.button.callback('➡️ بعدی', `next_word_${index}`),
      Markup.button.callback('🏠 منوی اصلی', 'back_to_menu'),
    ],
  ]);

  // Store words in session for navigation
  (ctx as any)._learningWords = words;
  (ctx as any)._learningIndex = index;

  await ctx.reply(msg, { parse_mode: 'Markdown', ...keyboard });
}

async function handleVocabReview(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = userRepo.findByTelegramId(telegramId);
  if (!user) return;

  const learned = progressRepo.getLearnedWords(user.id);
  const stats = progressRepo.getUserStats(user.id);

  let msg = `📝 **مرور واژگان**

شما در مجموع **${stats.totalLearned}** واژه یاد گرفته‌اید:

`;

  if (stats.dueToday > 0) {
    msg += `\n🔴 **${stats.dueToday}** واژه نیاز به مرور دارند!`;
  }
  if (stats.masteredCount > 0) {
    msg += `\n🟢 **${stats.masteredCount}** واژه با تسلط کامل`;
  }

  const keyboard = Markup.inlineKeyboard([
    stats.dueToday > 0 ? [Markup.button.callback(`🔄 شروع مرور (${stats.dueToday} واژه)`, 'start_review')] : [],
    [Markup.button.callback('📋 لیست واژگان', 'word_list')],
    [Markup.button.callback('🏠 منوی اصلی', 'back_to_menu')],
  ].filter(row => row.length > 0));

  await ctx.reply(msg, { parse_mode: 'Markdown', ...keyboard });
}

async function handleDailyQuizStart(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = userRepo.findByTelegramId(telegramId);
  if (!user) return;

  const stats = progressRepo.getUserStats(user.id);

  if (stats.totalLearned < 5) {
    await ctx.reply(
      '⚠️ شما هنوز واژگان کافی یاد نگرفته‌اید.\n\nحداقل ۵ واژه برای شرکت در کوییز لازم است.\n\nابتدا از بخش "شروع یادگیری" استفاده کنید.',
      { parse_mode: 'Markdown', ...getMainKeyboard() }
    );
    return;
  }

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🎯 شروع کوییز (۱۰ سوال)', 'start_quiz_10')],
    [Markup.button.callback('🎯 شروع کوییز (۲۰ سوال)', 'start_quiz_20')],
    [Markup.button.callback('🏠 منوی اصلی', 'back_to_menu')],
  ]);

  await ctx.reply(
    `🎯 **کوییز روزانه**

واژگان یادگرفته: **${stats.totalLearned}**
تسلط کامل: **${stats.masteredCount}**

چه تعداد سوال می‌خواهید؟`,
    { parse_mode: 'Markdown', ...keyboard }
  );
}
