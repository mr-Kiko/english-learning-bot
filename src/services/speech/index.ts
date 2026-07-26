import logger from '../../utils/logger';

export async function sendPronunciation(word: string): Promise<string | null> {
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const phonetics = data[0].phonetics;
      if (Array.isArray(phonetics)) {
        for (const p of phonetics) {
          if (p.audio && (p.audio.endsWith('.mp3') || p.audio.endsWith('.wav'))) {
            return p.audio;
          }
        }
      }
    }
    return null;
  } catch (error) {
    logger.error('Pronunciation fetch error:', error);
    return null;
  }
}

export async function getWordAudioUrl(word: string): Promise<string | null> {
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const phonetics = data[0].phonetics;
      if (Array.isArray(phonetics)) {
        for (const p of phonetics) {
          if (p.audio && (p.audio.endsWith('.mp3') || p.audio.endsWith('.wav'))) {
            return p.audio;
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
