// Telegram WebApp SDK
const tg = window.Telegram?.WebApp;

// State
let currentUser = null;
let currentWords = [];
let currentWordIndex = 0;
let quizWords = [];
let quizIndex = 0;
let quizScore = 0;
let quizResults = [];
let conversationContext = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#1a1a2e');
        tg.setBackgroundColor('#1a1a2e');
    }

    try {
        await loadUser();
        showScreen('main-menu');
    } catch (error) {
        console.error('Init error:', error);
        document.getElementById('loading-screen').innerHTML = '<p>خطا در بارگذاری. لطفاً دوباره تلاش کنید.</p>';
    }
});

// API Helper
async function api(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (tg?.initData) {
        headers['X-Telegram-Init-Data'] = tg.initData;
    }

    const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || 'API error');
    }

    return response.json();
}

// Load User
async function loadUser() {
    const data = await api('/user');
    currentUser = data.user;
    updateUserUI(data);
    showScreen('main-menu');
}

function updateUserUI(data) {
    const { user, stats } = data;

    document.getElementById('user-name').textContent = user.first_name || 'کاربر';
    document.getElementById('user-level').textContent = `سطح ${user.current_level}`;
    document.getElementById('user-streak').textContent = `🔥 ${user.learning_streak}`;

    document.getElementById('stat-learned').textContent = stats.totalLearned;
    document.getElementById('stat-mastered').textContent = stats.masteredCount;
    document.getElementById('stat-due').textContent = stats.dueToday;

    document.getElementById('due-count').textContent = `${stats.dueToday} واژه در انتظار مرور`;
    document.getElementById('current-lesson-info').textContent = `واحد ${user.current_unit} - درس ${user.current_lesson}`;
}

// Screen Navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
    }

    // Load screen-specific data
    if (screenId === 'lessons-screen') loadLessons();
    if (screenId === 'progress-screen') loadProgress();
}

// Learning
async function startNewLesson() {
    try {
        const data = await api('/learn');
        currentWords = data.newWords;
        currentWordIndex = 0;

        if (currentWords.length === 0) {
            alert('تبریک! تمام واژگان این درس را یاد گرفته‌اید! 🎉');
            return;
        }

        document.getElementById('learn-options').classList.add('hidden');
        document.getElementById('word-card-container').classList.remove('hidden');
        showCurrentWord();
    } catch (error) {
        console.error('Error starting lesson:', error);
    }
}

async function startReview() {
    try {
        const data = await api('/learn');
        currentWords = data.dueWords;
        currentWordIndex = 0;

        if (currentWords.length === 0) {
            alert('واژه‌ای برای مرور وجود ندارد! 👍');
            return;
        }

        document.getElementById('learn-options').classList.add('hidden');
        document.getElementById('word-card-container').classList.remove('hidden');
        showCurrentWord();
    } catch (error) {
        console.error('Error starting review:', error);
    }
}

function showCurrentWord() {
    if (currentWordIndex >= currentWords.length) {
        alert('آفرین! تمام واژگان را یاد گرفتید! 🎉');
        resetLearnScreen();
        return;
    }

    const word = currentWords[currentWordIndex];
    const progress = ((currentWordIndex + 1) / currentWords.length * 100);

    document.getElementById('word-progress').style.width = `${progress}%`;
    document.getElementById('current-word').textContent = word.word;
    document.getElementById('current-phonetic').textContent = word.pronunciation;
    document.getElementById('current-meaning').textContent = word.persian_meaning;
    document.getElementById('current-definition').textContent = word.english_definition;
    document.getElementById('current-example').textContent = word.example_sentence;
    document.getElementById('current-example-fa').textContent = word.example_persian;
}

async function markWord(correct) {
    const word = currentWords[currentWordIndex];

    try {
        await api('/learn/mark', {
            method: 'POST',
            body: JSON.stringify({ wordId: word.id, correct }),
        });

        currentWordIndex++;
        showCurrentWord();
    } catch (error) {
        console.error('Error marking word:', error);
    }
}

function resetLearnScreen() {
    document.getElementById('learn-options').classList.remove('hidden');
    document.getElementById('word-card-container').classList.add('hidden');
}

async function playPronunciation() {
    const word = currentWords[currentWordIndex];
    if (!word) return;

    try {
        const data = await api(`/speech/audio/${word.word}`);
        if (data.audioUrl) {
            const audio = new Audio(data.audioUrl);
            audio.play().catch(() => {
                // Fallback: use Web Speech API
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(word.word);
                    utterance.lang = 'en-US';
                    speechSynthesis.speak(utterance);
                }
            });
        } else if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word.word);
            utterance.lang = 'en-US';
            speechSynthesis.speak(utterance);
        }
    } catch {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word.word);
            utterance.lang = 'en-US';
            speechSynthesis.speak(utterance);
        }
    }
}

// Lessons
async function loadLessons() {
    try {
        const data = await api('/lessons');
        const container = document.getElementById('lessons-list');
        container.innerHTML = '';

        if (data.lessons.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-secondary)">هنوز درسی موجود نیست.</p>';
            return;
        }

        data.lessons.forEach(lesson => {
            const item = document.createElement('div');
            item.className = 'lesson-item';
            item.innerHTML = `
                <div class="lesson-info">
                    <h4>واحد ${lesson.unit} - درس ${lesson.lesson}</h4>
                    <p>${lesson.count} واژه</p>
                </div>
                <span class="lesson-count">${lesson.count} واژه</span>
            `;
            item.onclick = () => loadLessonWords(lesson.unit, lesson.lesson);
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading lessons:', error);
    }
}

async function loadLessonWords(unit, lesson) {
    try {
        const data = await api(`/lessons/${unit}/${lesson}`);
        currentWords = data.words;
        currentWordIndex = 0;

        if (currentWords.length === 0) {
            alert('واژه‌ای در این درس موجود نیست.');
            return;
        }

        showScreen('learn-screen');
        document.getElementById('learn-options').classList.add('hidden');
        document.getElementById('word-card-container').classList.remove('hidden');
        showCurrentWord();
    } catch (error) {
        console.error('Error loading lesson words:', error);
    }
}

// Quiz
async function startQuiz() {
    try {
        const data = await api('/quiz?count=10');
        quizWords = data.words;
        quizIndex = 0;
        quizScore = 0;
        quizResults = [];

        if (quizWords.length === 0) {
            alert('واژگان کافی برای کوییز وجود ندارد.');
            return;
        }

        showScreen('quiz-screen');
        showQuizQuestion();
    } catch (error) {
        console.error('Error starting quiz:', error);
    }
}

function showQuizQuestion() {
    if (quizIndex >= quizWords.length) {
        finishQuiz();
        return;
    }

    const word = quizWords[quizIndex];
    const progress = ((quizIndex + 1) / quizWords.length * 100);

    document.getElementById('quiz-progress').style.width = `${progress}%`;
    document.getElementById('quiz-score').textContent = `${quizIndex + 1}/${quizWords.length}`;

    // Random question type
    const types = ['multiple_choice', 'fill_blank', 'translation'];
    const type = types[Math.floor(Math.random() * types.length)];

    let html = '';

    switch (type) {
        case 'multiple_choice':
            const wrongOptions = quizWords
                .filter(w => w.id !== word.id)
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map(w => w.persian_meaning);
            const options = [...wrongOptions, word.persian_meaning].sort(() => Math.random() - 0.5);

            html = `
                <div class="quiz-question">
                    <h3>معنی کلمه را انتخاب کنید:</h3>
                    <div class="quiz-word">${word.word}</div>
                    <div class="quiz-options">
                        ${options.map(opt => `
                            <button class="quiz-option" onclick="checkQuizAnswer(this, '${opt}', '${word.persian_meaning}', '${word.id}')">${opt}</button>
                        `).join('')}
                    </div>
                </div>
            `;
            break;

        case 'fill_blank':
            const blank = word.example_sentence.replace(new RegExp(word.word, 'gi'), '______');
            html = `
                <div class="quiz-question">
                    <h3>کلمه صحیح را بنویسید:</h3>
                    <p style="font-size:18px;margin:16px 0">${blank}</p>
                    <p style="color:var(--text-secondary);margin-bottom:12px">🇮🇷 ${word.persian_meaning}</p>
                    <input type="text" class="quiz-input" id="fill-input" placeholder="کلمه را بنویسید..." onkeypress="if(event.key==='Enter')checkFillAnswer('${word.word}', '${word.id}')">
                    <button class="btn btn-primary" onclick="checkFillAnswer('${word.word}', '${word.id}')">بررسی</button>
                </div>
            `;
            break;

        case 'translation':
            html = `
                <div class="quiz-question">
                    <h3>ترجمه کنید:</h3>
                    <div class="quiz-word" style="font-size:24px">${word.persian_meaning}</div>
                    <p style="color:var(--text-secondary);margin-bottom:12px">به انگلیسی:</p>
                    <input type="text" class="quiz-input" id="translate-input" placeholder="ترجمه را بنویسید..." onkeypress="if(event.key==='Enter')checkTranslateAnswer('${word.word}', '${word.id}')">
                    <button class="btn btn-primary" onclick="checkTranslateAnswer('${word.word}', '${word.id}')">بررسی</button>
                </div>
            `;
            break;
    }

    document.getElementById('quiz-content').innerHTML = html;
}

function checkQuizAnswer(btn, selected, correct, wordId) {
    const isCorrect = selected === correct;
    const allOptions = document.querySelectorAll('.quiz-option');

    allOptions.forEach(opt => {
        opt.classList.add('disabled');
        if (opt.textContent === correct) {
            opt.classList.add('correct');
        }
    });

    if (!isCorrect) {
        btn.classList.add('wrong');
    }

    if (isCorrect) quizScore++;
    quizResults.push({ wordId: parseInt(wordId), correct: isCorrect });

    setTimeout(() => {
        quizIndex++;
        showQuizQuestion();
    }, 1000);
}

function checkFillAnswer(correct, wordId) {
    const input = document.getElementById('fill-input');
    const userAnswer = input.value.trim().toLowerCase();
    const isCorrect = userAnswer === correct.toLowerCase();

    if (isCorrect) quizScore++;
    quizResults.push({ wordId: parseInt(wordId), correct: isCorrect });

    input.style.borderColor = isCorrect ? 'var(--success)' : 'var(--danger)';
    input.disabled = true;

    if (!isCorrect) {
        input.value = `${input.value} → ${correct}`;
    }

    setTimeout(() => {
        quizIndex++;
        showQuizQuestion();
    }, 1200);
}

function checkTranslateAnswer(correct, wordId) {
    const input = document.getElementById('translate-input');
    const userAnswer = input.value.trim().toLowerCase();
    const isCorrect = userAnswer === correct.toLowerCase();

    if (isCorrect) quizScore++;
    quizResults.push({ wordId: parseInt(wordId), correct: isCorrect });

    input.style.borderColor = isCorrect ? 'var(--success)' : 'var(--danger)';
    input.disabled = true;

    if (!isCorrect) {
        input.value = `${input.value} → ${correct}`;
    }

    setTimeout(() => {
        quizIndex++;
        showQuizQuestion();
    }, 1200);
}

async function finishQuiz() {
    try {
        await api('/quiz/result', {
            method: 'POST',
            body: JSON.stringify({
                total_questions: quizWords.length,
                correct_answers: quizScore,
                words_reviewed: quizResults,
            }),
        });

        const score = (quizScore / quizWords.length * 100);
        let emoji = score >= 90 ? '🏆' : score >= 70 ? '🌟' : score >= 50 ? '👍' : '💪';
        let message = score >= 90 ? 'عالی! شما استاد هستید! 🎉' :
            score >= 70 ? 'خوب بود! ادامه بدهید! 💪' :
            score >= 50 ? 'قابل قبول است. تمرین بیشتر کمک می‌کند.' :
            'نگران نباشید! با تمرین بیشتر بهتر خواهید شد!';

        document.getElementById('result-emoji').textContent = emoji;
        document.getElementById('result-score').textContent = `${score.toFixed(0)}%`;
        document.getElementById('result-correct').textContent = quizScore;
        document.getElementById('result-wrong').textContent = quizWords.length - quizScore;
        document.getElementById('result-message').textContent = message;

        showScreen('quiz-result');
        loadUser(); // Refresh stats
    } catch (error) {
        console.error('Error saving quiz result:', error);
        showScreen('main-menu');
    }
}

function endQuiz() {
    if (quizIndex < quizWords.length) {
        if (confirm('آیا می‌خواهید کوییز را تمام کنید؟')) {
            showScreen('main-menu');
        }
    } else {
        showScreen('main-menu');
    }
}

// Progress
async function loadProgress() {
    try {
        const data = await api('/progress');
        const { stats, recentQuizzes, bestScore, learnedWords } = data;

        document.getElementById('progress-level').textContent = currentUser.current_level;
        document.getElementById('progress-unit').textContent = `${currentUser.current_unit} - درس ${currentUser.current_lesson}`;
        document.getElementById('progress-streak').textContent = `${currentUser.learning_streak} روز 🔥`;
        document.getElementById('progress-learned').textContent = stats.totalLearned;
        document.getElementById('progress-mastered').textContent = stats.masteredCount;
        document.getElementById('progress-avg').textContent = `${(stats.avgMastery * 20).toFixed(0)}%`;
        document.getElementById('progress-best').textContent = `${bestScore.toFixed(0)}%`;

        const historyContainer = document.getElementById('quiz-history');
        historyContainer.innerHTML = '';
        recentQuizzes.forEach(q => {
            historyContainer.innerHTML += `
                <div class="progress-row">
                    <span>${q.quiz_date}</span>
                    <span>${q.correct_answers}/${q.total_questions} (${q.score.toFixed(0)}%)</span>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

// Search
let searchTimeout;
function searchWords() {
    clearTimeout(searchTimeout);
    const query = document.getElementById('search-input').value;

    searchTimeout = setTimeout(async () => {
        if (query.length < 2) {
            document.getElementById('search-results').innerHTML = '';
            return;
        }

        try {
            const data = await api(`/search?q=${encodeURIComponent(query)}`);
            const container = document.getElementById('search-results');
            container.innerHTML = '';

            data.words.forEach(word => {
                container.innerHTML += `
                    <div class="search-result-item">
                        <h4>${word.word}</h4>
                        <p>${word.persian_meaning}</p>
                        <p style="font-size:12px;margin-top:4px">${word.example_sentence}</p>
                    </div>
                `;
            });
        } catch (error) {
            console.error('Search error:', error);
        }
    }, 300);
}

// AI Features
function showAISection(section) {
    document.querySelectorAll('.ai-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`ai-${section}`).classList.remove('hidden');
}

async function getGrammarExplanation() {
    const input = document.getElementById('grammar-input');
    const result = document.getElementById('grammar-result');

    if (!input.value.trim()) return;

    result.classList.remove('hidden');
    result.textContent = '⏳ در حال دریافت توضیحات...';

    try {
        const data = await api('/ai/grammar', {
            method: 'POST',
            body: JSON.stringify({ grammar: input.value }),
        });
        result.textContent = data.explanation;
    } catch (error) {
        result.textContent = '❌ خطا در دریافت توضیحات.';
    }
}

async function getExamples() {
    const input = document.getElementById('example-word-input');
    const result = document.getElementById('examples-result');

    if (!input.value.trim()) return;

    result.classList.remove('hidden');
    result.textContent = '⏳ در حال ساخت مثال‌ها...';

    try {
        const data = await api('/ai/examples', {
            method: 'POST',
            body: JSON.stringify({ word: input.value, persianMeaning: '' }),
        });
        result.textContent = data.examples;
    } catch (error) {
        result.textContent = '❌ خطا در ساخت مثال‌ها.';
    }
}

async function getCorrection() {
    const input = document.getElementById('correct-input');
    const result = document.getElementById('correction-result');

    if (!input.value.trim()) return;

    result.classList.remove('hidden');
    result.textContent = '⏳ در حال تصحیح...';

    try {
        const data = await api('/ai/correct', {
            method: 'POST',
            body: JSON.stringify({ sentence: input.value }),
        });
        result.textContent = data.correction;
    } catch (error) {
        result.textContent = '❌ خطا در تصحیح.';
    }
}

async function sendConversation() {
    const input = document.getElementById('conversation-input');
    const history = document.getElementById('conversation-history');

    if (!input.value.trim()) return;

    const message = input.value;
    input.value = '';

    // Add user message
    history.innerHTML += `<div class="conversation-msg user">${message}</div>`;
    history.scrollTop = history.scrollHeight;

    // Add loading
    const loadingId = 'loading-' + Date.now();
    history.innerHTML += `<div class="conversation-msg ai" id="${loadingId}">⏳</div>`;
    history.scrollTop = history.scrollHeight;

    try {
        const data = await api('/ai/conversation', {
            method: 'POST',
            body: JSON.stringify({ message, context: conversationContext }),
        });

        document.getElementById(loadingId).textContent = data.reply;
        conversationContext.push(message, data.reply);
    } catch (error) {
        document.getElementById(loadingId).textContent = '❌ خطا در دریافت پاسخ.';
    }
}

// Settings
async function updateSettings() {
    const select = document.getElementById('daily-words-select');
    try {
        await api('/user/settings', {
            method: 'POST',
            body: JSON.stringify({ daily_words_target: parseInt(select.value) }),
        });
    } catch (error) {
        console.error('Error updating settings:', error);
    }
}

// Telegram Haptic Feedback
function hapticFeedback(type = 'medium') {
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred(type);
    }
}
