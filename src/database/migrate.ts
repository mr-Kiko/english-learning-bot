import { getDatabase } from './connection';
import logger from '../utils/logger';

export function runMigrations(): void {
  const db = getDatabase();

  logger.info('Running database migrations...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      current_level INTEGER DEFAULT 1,
      current_unit INTEGER DEFAULT 1,
      current_lesson INTEGER DEFAULT 1,
      learning_streak INTEGER DEFAULT 0,
      last_active_date TEXT,
      daily_words_target INTEGER DEFAULT 10,
      is_admin INTEGER DEFAULT 0,
      language TEXT DEFAULT 'fa',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      pronunciation TEXT NOT NULL,
      persian_meaning TEXT NOT NULL,
      english_definition TEXT NOT NULL,
      part_of_speech TEXT NOT NULL,
      example_sentence TEXT NOT NULL,
      example_persian TEXT NOT NULL,
      difficulty_level INTEGER DEFAULT 1,
      unit INTEGER NOT NULL,
      lesson INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_word_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      word_id INTEGER NOT NULL,
      mastery_level INTEGER DEFAULT 0,
      ease_factor REAL DEFAULT 2.5,
      interval INTEGER DEFAULT 0,
      repetition INTEGER DEFAULT 0,
      next_review_date TEXT NOT NULL,
      correct_answers INTEGER DEFAULT 0,
      wrong_answers INTEGER DEFAULT 0,
      last_reviewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
      UNIQUE(user_id, word_id)
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      exercise_type TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT,
      correct_answer TEXT NOT NULL,
      persian_hint TEXT,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quiz_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      quiz_date TEXT NOT NULL,
      total_questions INTEGER NOT NULL,
      correct_answers INTEGER NOT NULL,
      score REAL NOT NULL,
      words_reviewed TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      stat_date TEXT NOT NULL,
      words_learned INTEGER DEFAULT 0,
      words_reviewed INTEGER DEFAULT 0,
      exercises_done INTEGER DEFAULT 0,
      quiz_score REAL DEFAULT 0,
      time_spent_seconds INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, stat_date)
    );

    CREATE INDEX IF NOT EXISTS idx_words_unit_lesson ON words(unit, lesson);
    CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_word_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_progress_review ON user_word_progress(next_review_date);
    CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id);
  `);

  logger.info('Database migrations completed');
}

if (require.main === module) {
  runMigrations();
  logger.info('Migration script completed');
}
