import { Router, Request, Response } from 'express';
import { config } from '../../config';
import { UserRepository, WordRepository, ProgressRepository, QuizRepository } from '../../src/database/repository';
import { verifyTelegramWebAppData } from '../../utils/tg-auth';
import { explainGrammarPersian, generateExamples, correctSentence, conversationPractice } from '../../src/services/ai';
import { getWordAudioUrl } from '../../src/services/speech';
import logger from '../../src/utils/logger';

const router = Router();
const userRepo = new UserRepository();
const wordRepo = new WordRepository();
const progressRepo = new ProgressRepository();
const quizRepo = new QuizRepository();

// Auth middleware
function authMiddleware(req: Request, res: Response, next: Function) {
  const initData = req.headers['x-telegram-init-data'] as string;

  if (!initData) {
    return res.status(401).json({ error: 'Unauthorized - No init data' });
  }

  const verified = verifyTelegramWebAppData(initData, config.bot.token);
  if (!verified) {
    return res.status(401).json({ error: 'Unauthorized - Invalid init data' });
  }

  // Parse user data from init
  const urlParams = new URLSearchParams(initData);
  const userStr = urlParams.get('user');
  if (userStr) {
    try {
      (req as any).telegramUser = JSON.parse(userStr);
    } catch {}
  }

  next();
}

// Apply auth to all API routes
router.use(authMiddleware);

// Get or create user
router.get('/user', (req: Request, res: Response) => {
  try {
    const telegramUser = (req as any).telegramUser;
    if (!telegramUser) {
      return res.status(400).json({ error: 'No user data' });
    }

    let user = userRepo.findByTelegramId(telegramUser.id);
    if (!user) {
      user = userRepo.create(
        telegramUser.id,
        telegramUser.username || null,
        telegramUser.first_name || null,
        telegramUser.last_name || null
      );
    }

    userRepo.updateStreak(user.id);
    const stats = progressRepo.getUserStats(user.id);

    res.json({ user, stats });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user settings
router.put('/user/settings', (req: Request, res: Response) => {
  try {
    const telegramUser = (req as any).telegramUser;
    const user = userRepo.findByTelegramId(telegramUser.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { daily_words_target, language } = req.body;
    userRepo.update(user.id, { daily_words_target, language });

    res.json({ success: true });
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all lessons
router.get('/lessons', (req: Request, res: Response) => {
  try {
    const lessons = wordRepo.getLessons();
    res.json({ lessons });
  } catch (error) {
    logger.error('Get lessons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get words for a specific lesson
router.get('/lessons/:unit/:lesson', (req: Request, res: Response) => {
  try {
    const unit = parseInt(req.params.unit as string);
    const lesson = parseInt(req.params.lesson as string);
    const words = wordRepo.findByUnitAndLesson(unit, lesson);
    res.json({ words });
  } catch (error) {
    logger.error('Get lesson words error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get words for learning (new + due for review)
router.get('/learn', (req: Request, res: Response) => {
  try {
    const telegramUser = (req as any).telegramUser;
    const user = userRepo.findByTelegramId(telegramUser.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const dueWords = progressRepo.getDueWords(user.id, 10);
    const newWords = progressRepo.getNewWordsForLesson(user.id, user.current_unit, user.current_lesson, 10);

    res.json({ dueWords, newWords, user: { current_unit: user.current_unit, current_lesson: user.current_lesson } });
  } catch (error) {
    logger.error('Get learn error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark word as learned
router.post('/learn/mark', (req: Request, res: Response) => {
  try {
    const telegramUser = (req as any).telegramUser;
    const user = userRepo.findByTelegramId(telegramUser.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { wordId, correct } = req.body;
    progressRepo.upsertProgress(user.id, wordId, correct);

    const stats = progressRepo.getUserStats(user.id);
    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Mark word error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get random words for quiz
router.get('/quiz', (req: Request, res: Response) => {
  try {
    const telegramUser = (req as any).telegramUser;
    const user = userRepo.findByTelegramId(telegramUser.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const count = parseInt(req.query.count as string) || 10;
    const learnedWordIds = progressRepo.getLearnedWordIds(user.id);
    const allWords = wordRepo.getAll();

    const wordsToQuiz = learnedWordIds.length >= count
      ? allWords.filter(w => learnedWordIds.includes(w.id)).sort(() => Math.random() - 0.5).slice(0, count)
      : allWords.sort(() => Math.random() - 0.5).slice(0, Math.min(count, allWords.length));

    res.json({ words: wordsToQuiz });
  } catch (error) {
    logger.error('Get quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save quiz result
router.post('/quiz/result', (req: Request, res: Response) => {
  try {
    const telegramUser = (req as any).telegramUser;
    const user = userRepo.findByTelegramId(telegramUser.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { total_questions, correct_answers, words_reviewed } = req.body;
    const score = (correct_answers / total_questions) * 100;

    quizRepo.save({
      user_id: user.id,
      quiz_date: new Date().toISOString().split('T')[0],
      total_questions,
      correct_answers,
      score,
      words_reviewed: JSON.stringify(words_reviewed),
    });

    // Update progress for each word
    for (const wordResult of words_reviewed) {
      progressRepo.upsertProgress(user.id, wordResult.wordId, wordResult.correct);
    }

    const stats = progressRepo.getUserStats(user.id);
    res.json({ success: true, score, stats });
  } catch (error) {
    logger.error('Save quiz result error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get progress
router.get('/progress', (req: Request, res: Response) => {
  try {
    const telegramUser = (req as any).telegramUser;
    const user = userRepo.findByTelegramId(telegramUser.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const stats = progressRepo.getUserStats(user.id);
    const recentQuizzes = quizRepo.getRecentResults(user.id, 10);
    const bestScore = quizRepo.getBestScore(user.id);
    const learnedWords = progressRepo.getLearnedWords(user.id);

    res.json({ stats, recentQuizzes, bestScore, learnedWords });
  } catch (error) {
    logger.error('Get progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search words
router.get('/search', (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      return res.json({ words: [] });
    }
    const words = wordRepo.search(query);
    res.json({ words });
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI Features
router.post('/ai/grammar', async (req: Request, res: Response) => {
  try {
    const { grammar } = req.body;
    const explanation = await explainGrammarPersian(grammar);
    res.json({ explanation });
  } catch (error) {
    logger.error('AI grammar error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/ai/examples', async (req: Request, res: Response) => {
  try {
    const { word, persianMeaning } = req.body;
    const examples = await generateExamples(word, persianMeaning);
    res.json({ examples });
  } catch (error) {
    logger.error('AI examples error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/ai/correct', async (req: Request, res: Response) => {
  try {
    const { sentence } = req.body;
    const correction = await correctSentence(sentence);
    res.json({ correction });
  } catch (error) {
    logger.error('AI correct error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/ai/conversation', async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body;
    const reply = await conversationPractice(message, context);
    res.json({ reply });
  } catch (error) {
    logger.error('AI conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Speech
router.get('/speech/audio/:word', async (req: Request, res: Response) => {
  try {
    const word = req.params.word as string;
    const audioUrl = await getWordAudioUrl(word);
    res.json({ audioUrl });
  } catch (error) {
    logger.error('Speech error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
