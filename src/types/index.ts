export interface User {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  current_level: number;
  current_lesson: number;
  current_unit: number;
  learning_streak: number;
  last_active_date: string | null;
  daily_words_target: number;
  is_admin: boolean;
  language: 'fa' | 'en';
  created_at: string;
  updated_at: string;
}

export interface Word {
  id: number;
  word: string;
  pronunciation: string;
  persian_meaning: string;
  english_definition: string;
  part_of_speech: string;
  example_sentence: string;
  example_persian: string;
  difficulty_level: number;
  unit: number;
  lesson: number;
}

export interface UserWordProgress {
  id: number;
  user_id: number;
  word_id: number;
  mastery_level: number;
  ease_factor: number;
  interval: number;
  repetition: number;
  next_review_date: string;
  correct_answers: number;
  wrong_answers: number;
  last_reviewed_at: string | null;
  created_at: string;
}

export interface Exercise {
  id: number;
  word_id: number;
  exercise_type: 'multiple_choice' | 'fill_blank' | 'translation_en_fa' | 'translation_fa_en' | 'matching';
  question: string;
  options: string | null;
  correct_answer: string;
  persian_hint: string | null;
}

export interface QuizResult {
  id: number;
  user_id: number;
  quiz_date: string;
  total_questions: number;
  correct_answers: number;
  score: number;
  words_reviewed: string;
}

export interface Lesson {
  unit: number;
  lesson: number;
  title: string;
  word_count: number;
}

export interface GameState {
  userId: number;
  currentWordIndex: number;
  words: Word[];
  mode: 'learning' | 'review' | 'quiz';
  score: number;
  total: number;
}

export interface CallbackQueryData {
  action: string;
  id?: string | number;
  extra?: string;
}
