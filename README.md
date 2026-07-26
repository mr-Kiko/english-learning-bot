# English Learning Mini App 🇬🇧

A complete Persian-to-English language learning platform built as a **Telegram Mini App**, based on the book "4000 Essential English Words".

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Telegram                      │
│  ┌─────────────────────────────────────────┐   │
│  │           Mini App (Web UI)              │   │
│  │    HTML + CSS + JavaScript               │   │
│  │    Runs inside Telegram WebApp           │   │
│  └─────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS API
┌──────────────────────▼──────────────────────────┐
│              Backend (Node.js)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Express  │  │ Telegraf │  │ OpenAI   │      │
│  │ API      │  │ Bot      │  │ AI       │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                      │                          │
│  ┌──────────────────────────────────────────┐  │
│  │              SQLite Database              │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Features

### Core Learning
- 📚 Vocabulary lessons from "4000 Essential English Words"
- 🔄 Spaced repetition algorithm (SM-2)
- 📝 Multiple exercise types (multiple choice, fill blank, translation)
- 🎯 Daily quizzes with scoring
- 📊 Progress tracking and statistics

### AI Features
- 🤖 Grammar explanations in Persian
- 💡 Example sentence generation
- ✏️ Sentence correction
- 💬 Conversation practice

### Voice
- 🔊 English pronunciation playback
- 🎤 Web Speech API integration

### Mini App
- 🎨 Modern, RTL Persian UI
- 📱 Mobile-first responsive design
- 🌙 Dark theme with Telegram integration
- ⚡ Fast and smooth animations

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- A Telegram Bot Token (from @BotFather)

### Setup

1. **Clone and install:**
```bash
cd english-learning-bot
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Initialize database:**
```bash
npm run setup
```

4. **Start development:**
```bash
npm run dev
```

5. **Set up your bot with BotFather:**
   - Create a new bot with `/newbot`
   - Set the WebApp URL: `/setmenubutton`
   - Or use: `/setwebapp` with your URL

### Production Deployment

#### Option 1: Railway (Recommended)
1. Push to GitHub
2. Connect to Railway
3. Add environment variables
4. Deploy

#### Option 2: VPS (Ubuntu/Debian)
```bash
# Install dependencies
sudo apt update && sudo apt install -y nodejs npm

# Clone and setup
git clone <repo-url>
cd english-learning-bot
npm install
cp .env.example .env
# Edit .env

# Run with PM2
npm install -g pm2
pm2 start dist/index.js --name english-bot
pm2 save
pm2 startup
```

#### Option 3: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Telegram Mini App Setup

1. Get your bot token from @BotFather
2. Send `/setmenubutton` to @BotFather
3. Select your bot
4. Enter the WebApp URL (e.g., `https://your-domain.com`)
5. Set the button text: `🚀 شروع یادگیری`

Or manually set via Bot API:
```
POST https://api.telegram.org/bot<TOKEN>/setChatMenuButton
{
  "menu_button": {
    "type": "web_app",
    "text": "🚀 شروع یادگیری",
    "web_app": {
      "url": "https://your-domain.com"
    }
  }
}
```

## Project Structure

```
english-learning-bot/
├── config.ts                 # Configuration
├── index.ts                  # Server entry point
├── bot.ts                    # Telegram bot setup
├── package.json
├── tsconfig.json
├── .env.example
├── server/
│   └── routes/
│       └── api.ts            # REST API routes
├── src/
│   ├── database/
│   │   ├── connection.ts     # SQLite connection
│   │   ├── migrate.ts        # Database migrations
│   │   ├── seed.ts           # Vocabulary data
│   │   └── repository.ts     # Data access layer
│   ├── services/
│   │   ├── ai/               # OpenAI integration
│   │   └── speech/           # TTS/pronunciation
│   ├── types/                # TypeScript types
│   └── utils/
│       └── logger.ts         # Winston logger
├── utils/
│   └── telegram-auth.ts      # WebApp data verification
├── public/                   # Mini App frontend
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
└── data/
    └── bot.db                # SQLite database (auto-created)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/user | Get current user |
| PUT | /api/user/settings | Update settings |
| GET | /api/lessons | Get all lessons |
| GET | /api/lessons/:unit/:lesson | Get lesson words |
| GET | /api/learn | Get words for learning |
| POST | /api/learn/mark | Mark word as learned |
| GET | /api/quiz | Get quiz words |
| POST | /api/quiz/result | Save quiz result |
| GET | /api/progress | Get user progress |
| GET | /api/search?q= | Search words |
| POST | /api/ai/grammar | Grammar explanation |
| POST | /api/ai/examples | Generate examples |
| POST | /api/ai/correct | Correct sentence |
| POST | /api/ai/conversation | AI conversation |

## Database Schema

### users
- telegram_id (unique)
- username, first_name, last_name
- current_level, current_unit, current_lesson
- learning_streak
- daily_words_target

### words
- word, pronunciation
- persian_meaning, english_definition
- part_of_speech
- example_sentence, example_persian
- unit, lesson

### user_word_progress
- user_id, word_id
- mastery_level (0-5)
- ease_factor, interval, repetition
- next_review_date
- correct_answers, wrong_answers

### quiz_results
- user_id, quiz_date
- total_questions, correct_answers, score

## Environment Variables

```env
# Required
BOT_TOKEN=your_telegram_bot_token

# Server
PORT=3000
NODE_ENV=development

# Mini App URL (for production)
WEBAPP_URL=https://your-domain.com

# OpenAI (optional)
OPENAI_API_KEY=your_openai_key

# Admin IDs
ADMIN_IDS=123456789
```

## Future Improvements

- [ ] Audio pronunciation for all words
- [ ] Flashcard mode
- [ ] Leaderboards
- [ ] Achievements system
- [ ] More exercise types
- [ ] Multi-language support
- [ ] Offline mode
- [ ] Push notifications
- [ ] Social features

## License

MIT
