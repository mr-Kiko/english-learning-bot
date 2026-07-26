import { getDatabase } from './connection';
import { runMigrations } from './migrate';
import logger from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

interface RawWord {
  word: string;
  pronunciation: string;
  part_of_speech: string;
  english_definition: string;
  example_sentence: string;
  book: number;
  unit: number;
}

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
  'view': 'دیدن', 'appropriate': 'مناسب', 'avoid': 'اجتناب کردن', 'behave': 'رفتار کردن', 'calm': 'آرام',
  'concern': 'نگرانی', 'content': 'محتوا', 'expect': 'انتظار داشتن', 'frequently': 'اغلب', 'habit': 'عادت',
  'instruct': 'آموزش دادن', 'issue': 'مسئله', 'none': 'هیچ', 'patient': 'صبور', 'positive': 'مثبت',
  'punish': 'تنبیه کردن', 'represent': 'نمایندگی کردن', 'shake': 'تکان دادن', 'spread': 'پخش کردن',
  'stroll': 'قدم زدن', 'village': 'روستا', 'active': 'فعال', 'adult': 'بزرگسال', 'age': 'سن',
  'bad': 'بد', 'balance': 'تعادل', 'bike': 'دوچرخه', 'choose': 'انتخاب کردن', 'doctor': 'پزشک',
  'during': 'در طول', 'football': 'فوتبال', 'fun': 'سرگرمی', 'game': 'بازی', 'heart': 'قلب',
  'golf': 'گلف', 'increase': 'افزایش', 'life': 'زندگی', 'kilometer': 'کیلومتر', 'often': 'اغلب',
  'plenty': 'فراوان', 'weight': 'وزن', 'accept': 'پذیرفتن', 'arrange': 'ترتیب دادن', 'attend': 'شرکت کردن',
  'chase': 'تعقیب کردن', 'contrast': 'تضاد', 'encourage': 'تشویق کردن', 'familiar': 'آشنا', 'grab': 'گرفتن',
  'hang': 'آویزان کردن', 'huge': 'بسیار بزرگ', 'necessary': 'لازم', 'pattern': 'الگو', 'propose': 'پیشنهاد کردن',
  'purpose': 'هدف', 'release': 'آزاد کردن', 'require': 'نیاز داشتن', 'satisfied': 'راضی', 'single': 'تنها',
  'tear': 'پاره کردن', 'theory': 'نظریه', 'animal': 'حیوان', 'bus': 'اتوبوس', 'cat': 'گربه',
  'command': 'فرمان', 'depend': 'وابسته بودن', 'dog': 'سگ', 'door': 'در', 'friend': 'دوست',
  'hear': 'شنیدن', 'help': 'کمک', 'horse': 'اسب', 'hospital': 'بیمارستان', 'leg': 'پا',
  'medical': 'پزشکی', 'open': 'باز کردن', 'pull': 'کشیدن', 'rabbit': 'خرگوش', 'school': 'مدرسه',
  'see': 'دیدن', 'service': 'خدمات', 'benefit': 'منفعت', 'certain': 'مطمئن', 'chance': 'شانس',
  'effect': 'اثر', 'essential': 'ضروری', 'far': 'دور', 'focus': 'تمرکز', 'function': 'عملکرد',
  'grass': 'چمن', 'guard': 'نگهبان', 'image': 'تصویر', 'immediate': 'فوری', 'primary': 'اولیه',
  'proud': 'مفتخر', 'remain': 'باقی ماندن', 'rest': 'استراحت', 'separate': 'جدا کردن', 'site': 'محل',
  'tail': 'دم', 'trouble': 'دردسر', 'advertise': 'تبلیغ کردن', 'aware': 'آگاه', 'battery': 'باتری',
  'black': 'سیاه', 'city': 'شهر', 'clean': 'تمیز', 'country': 'کشور', 'develop': 'توسعه دادن',
  'electric': 'الکتریکی', 'eventually': 'سرانجام', 'fact': 'واقعیت', 'glass': 'شیشه', 'history': 'تاریخ',
  'nature': 'طبیعت', 'never': 'هرگز', 'people': 'مردم', 'plastic': 'پلاستیک', 'problem': 'مشکل',
  'street': 'خیابان', 'think': 'فکر کردن', 'alone': 'تنها', 'apartment': 'آپارتمان', 'article': 'مقاله',
  'artist': 'هنرمند', 'attitude': 'نگرش', 'beauty': 'زیبایی', 'compare': 'مقایسه کردن', 'judge': 'قاضی',
  'magazine': 'مجله', 'material': 'ماده', 'meal': 'وعده غذا', 'method': 'روش', 'neighbor': 'همسایه',
  'professional': 'حرفه‌ای', 'profit': 'سود', 'quality': 'کیفیت', 'space': 'فضا', 'stair': 'پله',
  'symbol': 'نماد', 'thin': 'نازک', 'accounting': 'حسابداری', 'appeal': 'جذابیت', 'assume': 'فرض کردن',
  'borrow': 'قرض گرفتن', 'client': 'مشتری', 'downtown': 'مرکز شهر', 'dull': 'کسل‌کننده',
  'embarrass': 'شرمسار کردن', 'fare': 'کرایه', 'former': ' سابق', 'found': 'یافتن', 'invest': 'سرمایه‌گذاری کردن',
  'loan': 'وام', 'practical': 'عملی', 'quarter': 'یک چهارم', 'salary': 'حقوق', 'scholarship': 'بورسیه',
  'temporary': 'موقت', 'treasure': 'گنج', 'urge': 'ترغیب کردن', 'coach': 'مربی', 'control': 'کنترل',
  'description': 'توصیف', 'direct': 'مستقیم', 'exam': 'امتحان', 'example': 'مثال', 'limit': 'محدودیت',
  'local': 'محلی', 'magical': 'جادویی', 'mail': 'نامه', 'novel': 'رمان', 'outline': 'خط کلی',
  'poet': 'شاعر', 'print': 'چاپ', 'scene': 'صحنه', 'sheet': 'ورقه', 'silly': 'احمق',
  'store': 'فروشگاه', 'suffer': 'رنج بردن', 'technology': 'فناوری', 'across': 'از آن طرف',
  'breathe': 'نفس کشیدن', 'characteristic': 'ویژگی', 'consume': 'مصرف کردن', 'excite': 'هیجان زده کردن',
  'extremely': 'به شدت', 'fear': 'ترس', 'fortunate': 'خوش شانس', 'happen': 'اتفاق افتادن',
  'length': 'طول', 'mistake': 'اشتباه', 'observe': 'مشاهده کردن', 'opportunity': ' فرصت',
  'prize': 'جایزه', 'race': 'مسابقه', 'realize': 'آگاه شدن', 'respond': 'پاسخ دادن', 'risk': 'ریسک',
  'wonder': 'تعجب کردن', 'yet': 'هنوز', 'art': 'هنر', 'book': 'کتاب', 'clothes': 'لباس',
  'community': 'اجتماع', 'december': 'دسامبر', 'dinner': 'شام', 'end': 'پایان', 'exchange': 'تبادل',
  'family': 'خانواده', 'from': 'از', 'green': 'سبز', 'home': 'خانه', 'january': 'ژانویه',
  'red': 'قرمز', 'seven': 'هفت', 'start': 'شروع', 'together': 'با هم', 'university': 'دانشگاه',
  'wear': 'پوشیدن', 'year': 'سال', 'appreciate': 'قدردانی کردن', 'available': 'در دسترس',
  'beat': 'شکست دادن', 'bright': 'روشن', 'celebrate': 'جشن گرفتن', 'decide': 'تصمیم گرفتن',
  'disappear': 'ناپدید شدن', 'else': 'دیگر', 'fair': 'منصفانه', 'flow': 'جریان', 'forward': 'به جلو',
  'hill': 'تپه', 'level': 'سطح', 'lone': 'تنها', 'puddle': 'چاله آب', 'response': 'پاسخ',
  'season': 'فصل', 'solution': 'راه حل', 'waste': 'هدر دادن', 'whether': 'آیا', 'always': 'همیشه',
  'ask': 'پرسیدن', 'banana': 'موز', 'bread': 'نان', 'cake': 'کیک', 'carrot': 'هویج',
  'chicken': 'مرغ', 'chocolate': 'شکلات', 'contain': 'شامل شدن', 'delicious': 'خوشمزه',
  'diet': 'رژیم غذایی', 'eat': 'خوردن', 'food': 'غذا', 'fruit': 'میوه', 'great': 'عالی',
  'health': 'سلامتی', 'recipe': 'دستور غذا', 'restaurant': 'رستوران', 'special': 'ویژه', 'water': 'آب',
  'alive': 'زنده', 'bone': 'استخوان', 'bother': 'مزاحم شدن', 'captain': 'کاپیتان',
  'conclusion': 'نتیجه‌گیری', 'doubt': 'شک', 'explore': 'کاوش کردن', 'glad': 'خوشحال',
  'however': 'اما', 'injustice': 'بی عدالتی', 'international': 'بین‌المللی', 'lawyer': 'وکیل',
  'mention': 'اشاره کردن', 'old': 'قدیمی', 'policy': 'سیاست', 'social': 'اجتماعی', 'speech': 'سخنرانی',
  'staff': 'کارمندان', 'toward': 'به سمت', 'wood': 'چوب', 'achieve': 'دست یافتن', 'advise': 'توصیه کردن',
  'already': 'از قبل', 'basic': 'پایه', 'bit': 'کمی', 'consider': 'در نظر گرفتن', 'destroy': 'نابود کردن',
  'entertain': 'سرگرم کردن', 'extra': 'اضافه', 'goal': 'هدف', 'lie': 'دروغ گفتن', 'meat': 'گوشت',
  'opinion': 'نظر', 'real': 'واقعی', 'reflect': 'منعکس کردن', 'regard': 'نظر داشتن', 'serve': 'سرو کردن',
  'vegetable': 'سبزی', 'war': 'جنگ', 'worth': 'ارزش', 'appear': 'ظاهر شدن', 'base': 'پایه',
  'brain': 'مغز', 'career': 'شغل', 'clerk': 'منشی', 'effort': 'تلاش', 'enter': 'ورود کردن',
  'excellent': 'عالی', 'hero': 'قهرمان', 'hurry': 'عجله کردن', 'inform': 'اطلاع دادن', 'later': 'بعداً',
  'leave': 'ترک کردن', 'locate': 'مکان یابی کردن', 'nurse': 'پرستار', 'operation': 'عملیات',
  'pain': 'درد', 'refuse': 'امتناع کردن', 'though': 'اگرچه', 'various': 'مختلف', 'actual': 'واقعی',
  'amaze': 'شگفت زده کردن', 'charge': 'هزینه', 'comfort': 'آسایش', 'contact': 'تماس',
  'customer': 'مشتری', 'deliver': 'تحویل دادن', 'earn': 'کسب کردن', 'gate': 'دروازه',
  'include': 'شامل شدن', 'manage': 'مدیریت کردن', 'mystery': 'راز', 'occur': 'اتفاق افتادن',
  'opposite': 'متضاد', 'plate': 'بشقاب', 'receive': 'دریافت کردن', 'reward': 'پاداش', 'set': 'مجموعه',
  'steal': 'دزدیدن', 'thief': 'دزد', 'advance': 'پیشرفت', 'athlete': 'ورزشکار', 'average': 'متوسط',
  'behavior': 'رفتار', 'behind': 'پشت', 'course': 'دوره', 'lower': 'پایین‌تر', 'match': 'مسابقه',
  'member': 'عضو', 'mental': ' ذهنی', 'passenger': 'مسافر', 'personality': 'شخصیت', 'poem': 'شعر',
  'pole': 'قطب', 'remove': 'حذف کردن', 'safety': 'ایمنی', 'shoot': 'شلیک کردن', 'sound': 'صدا',
  'swim': 'شنا کردن', 'web': 'وب', 'block': 'بلوک', 'bury': 'دفن کردن', 'cheer': 'تشویق کردن',
  'complex': 'پیچیده', 'critic': 'منتقد', 'direction': 'جهت', 'event': 'رویداد', 'exercise': 'ورزش',
  'friendship': 'دوستی', 'guide': 'راهنما', 'lack': 'کمبود', 'perform': 'اجرا کردن', 'pressure': 'فشار',
  'probably': 'احتمالاً', 'public': 'عمومی', 'smart': 'هوشمند', 'strike': 'اعتصاب', 'support': 'حمایت',
  'term': 'دوره', 'unite': 'متحد شدن', 'associate': 'همکار', 'environment': 'محیط زیست', 'factory': 'کارخانه',
  'feature': 'ویژگی', 'instance': 'نمونه', 'involve': 'شامل شدن', 'medicine': 'دارو', 'mix': 'مخلوط کردن',
  'organize': 'سازماندهی کردن', 'period': 'دوره', 'populate': 'جمعیت داشتن', 'produce': 'تولید کردن',
  'range': 'محدوده', 'recognize': 'شناختن', 'regular': 'منظم', 'sign': 'نشان', 'tip': 'نکته',
  'tradition': 'سنت', 'trash': 'زباله', 'wide': '宽广', 'advice': 'توصیه', 'along': 'همراه',
  'attention': 'توجه', 'attract': 'جذب کردن', 'climb': 'بالا رفتن', 'drop': 'افتادن', 'final': 'نهایی',
  'further': 'بیشتر', 'imply': 'دلالت کردن', 'maintain': 'نگهداری کردن', 'neither': 'هیچ کدام',
  'otherwise': 'در غیر این صورت', 'physical': 'فیزیکی', 'prove': 'اثبات کردن', 'react': 'واکنش نشان دادن',
  'ride': 'سوار شدن', 'situated': 'واقع در', 'society': 'جامعه', 'standard': 'استاندارد', 'suggest': 'پیشنهاد کردن',
  'actually': 'در واقع', 'bite': 'گاز گرفتن', 'coast': 'ساحل', 'deal': 'معامله', 'desert': 'بیابان',
  'effective': 'مؤثر', 'examine': 'بررسی کردن', 'false': 'نادرست', 'figure out': 'فهمیدن', 'gift': 'هدیه',
  'hunger': 'گرسنگی', 'imagine': 'تصور کردن', 'journey': 'سفر', 'puzzle': 'معمای', 'quite': 'کاملاً',
  'rather': 'ترجیحاً', 'specific': 'مشخص', 'spider': 'عنکبوت', 'tour': 'تور', 'trip': 'سفر',
  'band': 'گروه', 'barely': 'به سختی', 'boring': 'کسل‌کننده', 'cancel': 'لغو کردن', 'driveway': 'ورودی',
  'garbage': 'زباله', 'instrument': 'ساز', 'list': 'لیست', 'magic': 'جادو', 'message': 'پیام',
  'notice': 'توجه کردن', 'own': 'مال خود', 'predict': 'پیش‌بینی کردن', 'professor': 'استاد',
  'rush': 'عجله کردن', 'schedule': 'برنامه زمانی', 'share': 'اشتراک گذاشتن', 'stage': 'مرحله',
  'storm': 'طوفان', 'within': 'در عرض', 'burden': 'بار', 'compromise': 'سازش', 'craft': 'صنایع دستی',
  'dive': 'شیرجه رفتن', 'fragile': 'شکننده', 'half': 'نصف', 'innocence': 'بی‌گناهی', 'lead': 'رهبری کردن',
  'meeting': 'جلسه', 'merge': 'ادغام شدن', 'moderate': 'متوسط', 'overwhelm': 'غرق شدن', 'payment': 'پرداخت',
  'perception': 'ادراک', 'settle': 'تعدیل کردن', 'shiver': 'لرزیدن', 'sociable': 'مجالس',
  'speed': 'سرعت', 'talkative': 'پرحرف', 'usual': 'معمولی', 'above': 'بالا', 'ahead': 'جلو',
  'amount': 'مقدار', 'belief': 'باور', 'center': 'مرکز', 'common': 'مشترک', 'cost': 'هزینه',
  'demonstrate': 'نشان دادن', 'different': 'متفاوت', 'evidence': 'مدرک', 'honesty': 'صداقت',
  'idiom': 'اصطلاح', 'independent': 'مستقل', 'inside': 'داخل', 'jail': 'زندان', 'master': 'استاد',
  'memory': 'حافظه', 'pocket': 'جیب', 'proper': 'مناسب', 'sale': 'فروش',
};

function getPersianMeaning(word: string): string {
  return persianMeanings[word.toLowerCase()] || '';
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

  // Read from JSON file
  const jsonPath = path.join(process.cwd(), 'data', 'words-raw.json');
  if (!fs.existsSync(jsonPath)) {
    logger.error(`Words file not found: ${jsonPath}`);
    return;
  }

  const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as RawWord[];
  logger.info(`Loaded ${rawData.length} words from JSON file`);

  const insertWord = db.prepare(`
    INSERT OR IGNORE INTO words (word, pronunciation, persian_meaning, english_definition, part_of_speech, example_sentence, example_persian, difficulty_level, unit, lesson)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  const insertMany = db.transaction((words: RawWord[]) => {
    for (const w of words) {
      const difficulty = Math.min(5, Math.ceil(w.book / 1.2));
      const persianMeaning = getPersianMeaning(w.word);
      insertWord.run(
        w.word,
        w.pronunciation || '',
        persianMeaning || w.word,
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

  insertMany(rawData);

  const finalCount = (db.prepare('SELECT COUNT(*) as count FROM words').get() as { count: number }).count;
  logger.info(`Seed completed. Total words in database: ${finalCount}`);
}

if (require.main === module) {
  runMigrations();
  runSeed();
}
