import { Context, Markup } from 'telegraf';
import { UserRepository, ProgressRepository, QuizRepository, WordRepository } from '../../database/repository';
import { Word } from '../../types';
import logger from '../../utils/logger';

const userRepo = new UserRepository();
const progressRepo = new ProgressRepository();
const quizRepo = new QuizRepository();
const wordRepo = new WordRepository();

interface QuizState {
  words: Word[];
  currentIndex: number;
  score: number;
  answers: { wordId: number; correct: boolean }[];
  mode: 'multiple_choice' | 'fill_blank' | 'translation';
}

const activeQuizzes = new Map<number, QuizState>();

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getMultipleChoiceOptions(correctWord: Word, allWords: Word[]): string[] {
  const others = allWords.filter(w => w.id !== correctWord.id);
  const shuffled = shuffleArray(others).slice(0, 3);
  const options = shuffleArray([correctWord.persian_meaning, ...shuffled.map(w => w.persian_meaning)]);
  return options;
}

export async function startQuiz(ctx: Context, count: number = 10): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = userRepo.findByTelegramId(telegramId);
  if (!user) return;

  const allWords = wordRepo.getAll();
  if (allWords.length < 5) {
    await ctx.reply('⚠️ واژگان کافی در دیتابیس وجود ندارد.', { parse_mode: 'Markdown' });
    return;
  }

  const learnedWordIds = progressRepo.getLearnedWordIds(user.id);
  const wordsToQuiz = learnedWordIds.length >= count
    ? shuffleArray(allWords.filter(w => learnedWordIds.includes(w.id))).slice(0, count)
    : shuffleArray(allWords).slice(0, Math.min(count, allWords.length));

  const quizState: QuizState = {
    words: wordsToQuiz,
    currentIndex: 0,
    score: 0,
    answers: [],
    mode: 'multiple_choice',
  };

  activeQuizzes.set(telegramId, quizState);
  await showQuizQuestion(ctx, quizState);
}

async function showQuizQuestion(ctx: Context, state: QuizState): Promise<void> {
  if (state.currentIndex >= state.words.length) {
    await finishQuiz(ctx, state);
    return;
  }

  const word = state.words[state.currentIndex];
  const allWords = wordRepo.getAll();
  const progress = ((state.currentIndex + 1) / state.words.length * 100).toFixed(0);

  // Randomly choose question type
  const types: QuizState['mode'][] = ['multiple_choice', 'fill_blank', 'translation'];
  const type = types[Math.floor(Math.random() * types.length)];
  state.mode = type;

  let msg = '';
  let keyboard: any;

  switch (type) {
    case 'multiple_choice':
      const options = getMultipleChoiceOptions(word, allWords);
      msg = `🎯 **سوال ${state.currentIndex + 1}/${state.words.length}** (${progress}%)

━━━━━━━━━━━━━━━━━━━━━━━

**معنی کلمه "${word.word}" چیست؟**

 الف) ${options[0]}
 ب) ${options[1]}
 ج) ${options[2]}
 د) ${options[3]}`;

      keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('الف', `quiz_mc_${options[0]}`),
          Markup.button.callback('ب', `quiz_mc_${options[1]}`),
        ],
        [
          Markup.button.callback('ج', `quiz_mc_${options[2]}`),
          Markup.button.callback('د', `quiz_mc_${options[3]}`),
        ],
      ]);
      break;

    case 'fill_blank':
      const blank = word.example_sentence.replace(new RegExp(word.word, 'gi'), '______');
      msg = `🎯 **سوال ${state.currentIndex + 1}/${state.words.length}** (${progress}%)

━━━━━━━━━━━━━━━━━━━━━━━

**کلمه صحیح را بنویسید:**

${blank}

🇮🇷 معنی: ${word.persian_meaning}`;

      keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('💡 راهنما', `quiz_hint_${word.id}`)],
        [Markup.button.callback('➡️ رد شدن', 'quiz_skip')],
      ]);
      break;

    case 'translation':
      msg = `🎯 **سوال ${state.currentIndex + 1}/${state.words.length}** (${progress}%)

━━━━━━━━━━━━━━━━━━━━━━━

**ترجمه کنید:**

🇮🇷 ${word.persian_meaning}

به انگلیسی:`;

      keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('💡 راهنما', `quiz_hint_${word.id}`)],
        [Markup.button.callback('➡️ رد شدن', 'quiz_skip')],
      ]);
      break;
  }

  await ctx.reply(msg, { parse_mode: 'Markdown', ...keyboard });
}

async function finishQuiz(ctx: Context, state: QuizState): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = userRepo.findByTelegramId(telegramId);
  if (!user) return;

  const score = (state.score / state.words.length) * 100;

  // Save quiz result
  quizRepo.save({
    user_id: user.id,
    quiz_date: new Date().toISOString().split('T')[0],
    total_questions: state.words.length,
    correct_answers: state.score,
    score,
    words_reviewed: JSON.stringify(state.answers),
  });

  // Update word progress
  for (const answer of state.answers) {
    progressRepo.upsertProgress(user.id, answer.wordId, answer.correct);
  }

  let emoji = '';
  if (score >= 90) emoji = '🏆';
  else if (score >= 70) emoji = '🌟';
  else if (score >= 50) emoji = '👍';
  else emoji = '💪';

  const msg = `🎯 **نتیجه کوییز**

━━━━━━━━━━━━━━━━━━━━━━━

${emoji} **نمره شما: ${score.toFixed(0)}%**

✅ پاسخ‌های صحیح: ${state.score}
❌ پاسخ‌های غلط: ${state.words.length - state.score}
📊 تعداد سوالات: ${state.words.length}

━━━━━━━━━━━━━━━━━━━━━━━

${score >= 90 ? 'عالی! شما استاد هستید! 🎉' :
  score >= 70 ? 'خوب بود! ادامه بدهید! 💪' :
  score >= 50 ? 'قابل قبول است. تمرین بیشتر کمک می‌کند.' :
  'نگران نباشید! با تمرین بیشتر بهتر خواهید شد!'}`;

  activeQuizzes.delete(telegramId);

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🔄 کوییز مجدد', 'daily_quiz')],
    [Markup.button.callback('📊 جزئیات', 'my_progress')],
    [Markup.button.callback('🏠 منوی اصلی', 'back_to_menu')],
  ]);

  await ctx.reply(msg, { parse_mode: 'Markdown', ...keyboard });
}

export async function handleQuizCallback(ctx: Context, data: string): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const state = activeQuizzes.get(telegramId);
  if (!state) {
    await ctx.reply('⚠️ کوییز تمام شده است. لطفاً کوییز جدید شروع کنید.');
    return;
  }

  if (data.startsWith('quiz_mc_')) {
    const answer = data.replace('quiz_mc_', '');
    const correctWord = state.words[state.currentIndex];
    const isCorrect = answer === correctWord.persian_meaning;

    state.answers.push({ wordId: correctWord.id, correct: isCorrect });
    if (isCorrect) state.score++;

    const emoji = isCorrect ? '✅' : '❌';
    const msg = isCorrect
      ? `${emoji} **آفرین! پاسخ صحیح!**`
      : `${emoji} **پاسخ غلط!**\n\nپاسخ صحیح: **${correctWord.persian_meaning}**`;

    await ctx.reply(msg, { parse_mode: 'Markdown' });

    state.currentIndex++;
    await showQuizQuestion(ctx, state);
  } else if (data === 'quiz_skip') {
    const word = state.words[state.currentIndex];
    state.answers.push({ wordId: word.id, correct: false });
    state.currentIndex++;
    await showQuizQuestion(ctx, state);
  } else if (data.startsWith('quiz_hint_')) {
    const wordId = parseInt(data.replace('quiz_hint_', ''));
    const word = wordRepo.findById(wordId);
    if (word) {
      const hint = word.persian_meaning.substring(0, 2) + '...';
      await ctx.reply(`💡 راهنما: **${hint}**`, { parse_mode: 'Markdown' });
    }
  }
}

export function isQuizActive(telegramId: number): boolean {
  return activeQuizzes.has(telegramId);
}
