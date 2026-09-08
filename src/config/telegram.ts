import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const telegramConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  chatId: process.env.TELEGRAM_CHAT_ID || '',
};

export function validateTelegramConfig(): boolean {
  if (!telegramConfig.botToken || !telegramConfig.chatId) {
    console.warn('⚠️ Telegram configuration is incomplete - notifications will be disabled');
    return false;
  }
  return true;
}