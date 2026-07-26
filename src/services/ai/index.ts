import OpenAI from 'openai';
import { config } from '../../config';
import logger from '../../utils/logger';

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!config.openai.apiKey) return null;
  if (!client) {
    client = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return client;
}

export async function explainGrammarPersian(grammar: string): Promise<string> {
  const c = getClient();
  if (!c) return '⚠️ قابلیت هوش مصنوعی فعال نیست. لطفاً کلید API را تنظیم کنید.';

  try {
    const response = await c.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: 'You are a helpful English teacher for Persian speakers. Explain grammar in simple Persian. Use examples.' },
        { role: 'user', content: `لطفاً این گرامر را به فارسی توضیح بده: ${grammar}` }
      ],
      max_tokens: 500,
    });
    return response.choices[0]?.message?.content || 'پاسخی دریافت نشد.';
  } catch (error) {
    logger.error('AI grammar explanation error:', error);
    return 'خطا در دریافت پاسخ. لطفاً دوباره تلاش کنید.';
  }
}

export async function generateExamples(word: string, persianMeaning: string): Promise<string> {
  const c = getClient();
  if (!c) return '⚠️ قابلیت هوش مصنوعی فعال نیست.';

  try {
    const response = await c.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: 'You are an English vocabulary teacher. Generate 3 example sentences for the given word. Include Persian translations.' },
        { role: 'user', content: `Word: ${word}\nMeaning: ${persianMeaning}\n\nGenerate 3 different example sentences with Persian translations.` }
      ],
      max_tokens: 400,
    });
    return response.choices[0]?.message?.content || 'پاسخی دریافت نشد.';
  } catch (error) {
    logger.error('AI example generation error:', error);
    return 'خطا در دریافت پاسخ.';
  }
}

export async function correctSentence(sentence: string): Promise<string> {
  const c = getClient();
  if (!c) return '⚠️ قابلیت هوش مصنوعی فعال نیست.';

  try {
    const response = await c.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: 'You are an English teacher. Correct the user\'s English sentence. Explain mistakes in Persian. If the sentence is correct, say it is correct and praise the user.' },
        { role: 'user', content: `Correct this sentence and explain errors in Persian:\n\n"${sentence}"` }
      ],
      max_tokens: 400,
    });
    return response.choices[0]?.message?.content || 'پاسخی دریافت نشد.';
  } catch (error) {
    logger.error('AI sentence correction error:', error);
    return 'خطا در دریافت پاسخ.';
  }
}

export async function conversationPractice(userMessage: string, context: string[] = []): Promise<string> {
  const c = getClient();
  if (!c) return '⚠️ قابلیت هوش مصنوعی فعال نیست.';

  try {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: 'You are a friendly English conversation partner for Persian-speaking learners. Speak in simple English. When the user makes mistakes, correct them gently and explain in Persian. Keep responses short and encouraging.' },
      ...context.map((msg, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg,
      })),
      { role: 'user', content: userMessage }
    ];

    const response = await c.chat.completions.create({
      model: config.openai.model,
      messages,
      max_tokens: 300,
    });
    return response.choices[0]?.message?.content || 'پاسخی دریافت نشد.';
  } catch (error) {
    logger.error('AI conversation error:', error);
    return 'خطا در دریافت پاسخ.';
  }
}
