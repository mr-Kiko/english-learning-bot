import { getDatabase } from './connection';
import { runMigrations } from './migrate';
import logger from '../utils/logger';
import { vocabularyData } from '../data/vocabulary-raw';

const persianMeanings: Record<string, string> = {
  'agree': 'موافقت کردن', 'alcohol': 'الکل', 'arrive': 'رسیدن', 'august': 'آگوست', 'boat': 'قایق',
  'breakfast': 'صبحانه', 'camera': 'دوربین', 'capital': 'پایتخت', 'catch': 'گرفتن', 'duck': 'اردک',
  'enjoy': 'لذت بردن', 'invite': 'دعوت کردن', 'love': 'دوست داشتن', 'month': 'ماه', 'travel': 'سفر کردن',
  'typical': 'معمولی', 'visit': 'دیدن', 'weather': 'آب و هوا', 'week': 'هفته', 'wine': 'شراب',
  'adventure': 'ماجراجویی', 'approach': 'نزدیک شدن', 'carefully': 'به دقت', 'chemical': 'شیمیایی',
  'create': 'ایجاد کردن', 'evil': 'شر', 'experiment': 'آزمایش', 'kill': 'کشتن', 'laboratory': 'آزمایشگاه',
  'laugh': 'خنده', 'loud': 'بلند', 'nervous': 'عصبی', 'noise': 'صدا', 'project': 'پروژه',
  'scare': 'ترساندن', 'secret': 'راز', 'shout': 'فریاد زدن', 'smell': 'بوییدن', 'terrible': 'وحشتناک',
  'worse': 'بدتر', 'alien': 'بیگانه', 'among': 'در میان', 'chart': 'جدول', 'cloud': 'ابر',
  'describe': 'توصیف کردن', 'ever': 'هرگز', 'fail': 'شکست خوردن', 'grade': 'نمره', 'instead': 'به جای',
  'library': 'کتابخانه', 'photograph': 'عکس', 'planet': 'سیاره', 'report': 'گزارش', 'several': 'چند',
  'shape': 'شکل', 'solve': 'حل کردن', 'suddenly': 'ناگهان', 'suppose': 'فرض کردن', 'understand': 'فهمیدن',
  'view': 'دیدن',
};

function getPersianMeaning(word: string): string {
  return persianMeanings[word.toLowerCase()] || word;
}

function mapPartOfSpeech(pos: string): string {
  const posMap: Record<string, string> = {
    'v': 'verb', 'n': 'noun', 'adj': 'adjective', 'adv': 'adverb',
    'prep': 'preposition', 'conj': 'conjunction', 'pron': 'pronoun',
  };
  return posMap[pos.toLowerCase()] || pos;
}

export function runSeed(): void {
  const db = getDatabase();

  logger.info('Running database seed with 4000 Essential English Words...');

  const existingCount = (db.prepare('SELECT COUNT(*) as count FROM words').get() as { count: number }).count;
  if (existingCount > 100) {
    logger.info(`Database already has ${existingCount} words. Skipping seed.`);
    return;
  }

  const insertWord = db.prepare(`
    INSERT OR IGNORE INTO words (word, pronunciation, persian_meaning, english_definition, part_of_speech, example_sentence, example_persian, difficulty_level, unit, lesson)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  const insertMany = db.transaction((words: typeof vocabularyData) => {
    for (const w of words) {
      const difficulty = Math.min(5, Math.ceil(w.book / 1.2));
      insertWord.run(
        w.word,
        w.pronunciation || '',
        getPersianMeaning(w.word),
        w.english_definition,
        mapPartOfSpeech(w.part_of_speech),
        w.example_sentence,
        '',
        difficulty,
        w.book,
        w.unit
      );
      count++;
    }
  });

  insertMany(vocabularyData);

  const finalCount = (db.prepare('SELECT COUNT(*) as count FROM words').get() as { count: number }).count;
  logger.info(`Seed completed. Total words in database: ${finalCount}`);
}

if (require.main === module) {
  runMigrations();
  runSeed();
}
