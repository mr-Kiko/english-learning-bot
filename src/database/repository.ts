import { getDatabase } from './connection';
import { User, Word, UserWordProgress, QuizResult } from '../types';

export class UserRepository {
  private db = getDatabase();

  findByTelegramId(telegramId: number): User | undefined {
    return this.db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId) as User | undefined;
  }

  create(telegramId: number, username: string | null, firstName: string | null, lastName: string | null): User {
    const isAdmin = 0;
    const stmt = this.db.prepare(`
      INSERT INTO users (telegram_id, username, first_name, last_name, is_admin)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(telegramId, username, firstName, lastName, isAdmin);
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as User;
  }

  update(userId: number, data: Partial<User>): void {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    this.db.prepare(`UPDATE users SET ${fields}, updated_at = datetime('now') WHERE id = ?`).run(...values, userId);
  }

  updateStreak(userId: number): void {
    const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User;
    const today = new Date().toISOString().split('T')[0];

    if (user.last_active_date === today) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newStreak = user.last_active_date === yesterday ? user.learning_streak + 1 : 1;

    this.db.prepare('UPDATE users SET learning_streak = ?, last_active_date = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(newStreak, today, userId);
  }

  getAll(): User[] {
    return this.db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as User[];
  }

  getCount(): number {
    return (this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  }
}

export class WordRepository {
  private db = getDatabase();

  findByUnitAndLesson(unit: number, lesson: number): Word[] {
    return this.db.prepare('SELECT * FROM words WHERE unit = ? AND lesson = ? ORDER BY id').all(unit, lesson) as Word[];
  }

  findById(id: number): Word | undefined {
    return this.db.prepare('SELECT * FROM words WHERE id = ?').get(id) as Word | undefined;
  }

  getRandom(count: number): Word[] {
    return this.db.prepare('SELECT * FROM words ORDER BY RANDOM() LIMIT ?').all(count) as Word[];
  }

  search(query: string): Word[] {
    return this.db.prepare('SELECT * FROM words WHERE word LIKE ? OR persian_meaning LIKE ? LIMIT 10')
      .all(`%${query}%`, `%${query}%`) as Word[];
  }

  getAll(): Word[] {
    return this.db.prepare('SELECT * FROM words ORDER BY unit, lesson, id').all() as Word[];
  }

  getCount(): number {
    return (this.db.prepare('SELECT COUNT(*) as count FROM words').get() as { count: number }).count;
  }

  getLessons(): { unit: number; lesson: number; count: number }[] {
    return this.db.prepare('SELECT unit, lesson, COUNT(*) as count FROM words GROUP BY unit, lesson ORDER BY unit, lesson').all() as { unit: number; lesson: number; count: number }[];
  }

  create(word: Omit<Word, 'id'>): Word {
    const stmt = this.db.prepare(`
      INSERT INTO words (word, pronunciation, persian_meaning, english_definition, part_of_speech, example_sentence, example_persian, difficulty_level, unit, lesson)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(word.word, word.pronunciation, word.persian_meaning, word.english_definition, word.part_of_speech, word.example_sentence, word.example_persian, word.difficulty_level, word.unit, word.lesson);
    return this.db.prepare('SELECT * FROM words WHERE id = ?').get(result.lastInsertRowid) as Word;
  }
}

export class ProgressRepository {
  private db = getDatabase();

  getWordProgress(userId: number, wordId: number): UserWordProgress | undefined {
    return this.db.prepare('SELECT * FROM user_word_progress WHERE user_id = ? AND word_id = ?').get(userId, wordId) as UserWordProgress | undefined;
  }

  getDueWords(userId: number, limit: number = 10): (UserWordProgress & Word)[] {
    const today = new Date().toISOString().split('T')[0];
    return this.db.prepare(`
      SELECT p.*, w.* FROM user_word_progress p
      JOIN words w ON p.word_id = w.id
      WHERE p.user_id = ? AND p.next_review_date <= ?
      ORDER BY p.next_review_date ASC
      LIMIT ?
    `).all(userId, today, limit) as (UserWordProgress & Word)[];
  }

  getLearnedWords(userId: number): UserWordProgress[] {
    return this.db.prepare('SELECT * FROM user_word_progress WHERE user_id = ? ORDER BY created_at DESC').all(userId) as UserWordProgress[];
  }

  getLearnedWordIds(userId: number): number[] {
    const rows = this.db.prepare('SELECT word_id FROM user_word_progress WHERE user_id = ?').all(userId) as { word_id: number }[];
    return rows.map(r => r.word_id);
  }

  getNewWordsForLesson(userId: number, unit: number, lesson: number, limit: number): Word[] {
    const learnedIds = this.getLearnedWordIds(userId);
    const placeholders = learnedIds.length > 0 ? learnedIds.map(() => '?').join(',') : '0';
    const query = learnedIds.length > 0
      ? `SELECT * FROM words WHERE unit = ? AND lesson = ? AND id NOT IN (${placeholders}) ORDER BY id LIMIT ?`
      : `SELECT * FROM words WHERE unit = ? AND lesson = ? ORDER BY id LIMIT ?`;
    const params = learnedIds.length > 0 ? [unit, lesson, ...learnedIds, limit] : [unit, lesson, limit];
    return this.db.prepare(query).all(...params) as Word[];
  }

  upsertProgress(userId: number, wordId: number, correct: boolean): void {
    const existing = this.getWordProgress(userId, wordId);
    const today = new Date().toISOString().split('T')[0];

    if (existing) {
      const { easeFactor, interval, repetition, masteryLevel } = this.calculateSM2(existing, correct);
      this.db.prepare(`
        UPDATE user_word_progress SET
          mastery_level = ?, ease_factor = ?, interval = ?, repetition = ?,
          next_review_date = ?, correct_answers = correct_answers + ?,
          wrong_answers = wrong_answers + ?, last_reviewed_at = datetime('now')
        WHERE id = ?
      `).run(masteryLevel, easeFactor, interval, repetition, today, correct ? 1 : 0, correct ? 0 : 1, existing.id);
    } else {
      const interval = correct ? 1 : 0;
      const nextReview = new Date(Date.now() + interval * 86400000).toISOString().split('T')[0];
      this.db.prepare(`
        INSERT INTO user_word_progress (user_id, word_id, mastery_level, ease_factor, interval, repetition, next_review_date, correct_answers, wrong_answers)
        VALUES (?, ?, ?, 2.5, ?, 0, ?, ?, ?)
      `).run(userId, wordId, correct ? 1 : 0, interval, nextReview, correct ? 1 : 0, correct ? 0 : 1);
    }
  }

  private calculateSM2(progress: UserWordProgress, correct: boolean): { easeFactor: number; interval: number; repetition: number; masteryLevel: number } {
    let { ease_factor, interval, repetition, mastery_level } = progress;

    if (correct) {
      if (repetition === 0) {
        interval = 1;
      } else if (repetition === 1) {
        interval = 3;
      } else {
        interval = Math.round(interval * ease_factor);
      }
      repetition += 1;
      ease_factor = Math.max(1.3, ease_factor + (0.1 - (5 - 4) * (0.08 + (5 - 4) * 0.02)));
      mastery_level = Math.min(5, mastery_level + 1);
    } else {
      repetition = 0;
      interval = 0;
      ease_factor = Math.max(1.3, ease_factor - 0.2);
      mastery_level = Math.max(0, mastery_level - 1);
    }

    const nextReview = new Date(Date.now() + interval * 86400000).toISOString().split('T')[0];

    return { easeFactor: ease_factor, interval, repetition, masteryLevel: mastery_level };
  }

  getUserStats(userId: number): { totalLearned: number; masteredCount: number; dueToday: number; avgMastery: number } {
    const total = (this.db.prepare('SELECT COUNT(*) as count FROM user_word_progress WHERE user_id = ?').get(userId) as { count: number }).count;
    const mastered = (this.db.prepare('SELECT COUNT(*) as count FROM user_word_progress WHERE user_id = ? AND mastery_level >= 4').get(userId) as { count: number }).count;
    const today = new Date().toISOString().split('T')[0];
    const due = (this.db.prepare('SELECT COUNT(*) as count FROM user_word_progress WHERE user_id = ? AND next_review_date <= ?').get(userId, today) as { count: number }).count;
    const avg = (this.db.prepare('SELECT AVG(mastery_level) as avg FROM user_word_progress WHERE user_id = ?').get(userId) as { avg: number }).avg || 0;

    return { totalLearned: total, masteredCount: mastered, dueToday: due, avgMastery: avg };
  }
}

export class QuizRepository {
  private db = getDatabase();

  save(result: Omit<QuizResult, 'id'>): void {
    this.db.prepare(`
      INSERT INTO quiz_results (user_id, quiz_date, total_questions, correct_answers, score, words_reviewed)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(result.user_id, result.quiz_date, result.total_questions, result.correct_answers, result.score, result.words_reviewed);
  }

  getRecentResults(userId: number, limit: number = 5): QuizResult[] {
    return this.db.prepare('SELECT * FROM quiz_results WHERE user_id = ? ORDER BY quiz_date DESC LIMIT ?').all(userId, limit) as QuizResult[];
  }

  getBestScore(userId: number): number {
    const result = this.db.prepare('SELECT MAX(score) as best FROM quiz_results WHERE user_id = ?').get(userId) as { best: number };
    return result.best || 0;
  }
}
