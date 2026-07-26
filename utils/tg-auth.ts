import crypto from 'crypto';

export function verifyTelegramWebAppData(initData: string, botToken: string): boolean {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    const dataToCheck: string[] = [];

    // Sort and collect all params except hash
    const sortedParams = [...urlParams.entries()]
      .filter(([key]) => key !== 'hash')
      .sort((a, b) => a[0].localeCompare(b[0]));

    for (const [key, value] of sortedParams) {
      dataToCheck.push(`${key}=${value}`);
    }

    const dataCheckString = dataToCheck.join('\n');

    // Create HMAC with bot token
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return calculatedHash === hash;
  } catch (error) {
    console.error('Telegram auth verification error:', error);
    return false;
  }
}
