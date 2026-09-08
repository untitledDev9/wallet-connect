import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const emailConfig = {
  resendApiKey: process.env.RESEND_API_KEY || '',
  notificationEmail: process.env.NOTIFICATION_EMAIL || 'admin@walletconnect.com',
  fromEmail: process.env.EMAIL_FROM || 'notifications@walletconnect.com',
};

export function validateEmailConfig(): boolean {
  if (!emailConfig.resendApiKey) {
    console.warn('⚠️ Resend API key is missing - email notifications will be disabled');
    return false;
  }
  return true;
}