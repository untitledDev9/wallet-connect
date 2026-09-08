import { Router } from 'express';
import { AdminKey } from '../models/AdminKey';
import { Message } from '../models/Message';
import { WalletConnection } from '../models/WalletConnection';

const router = Router();

// Health check
router.get('/', (_req, res) => {
  res.json({ status: 'ok', admin: true });
});

// ============= SUPPORT CONVERSATIONS =============
router.get('/conversations', async (_req, res) => {
  const conversations = await Message.aggregate([
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$text' },
        lastMessageAt: { $first: '$createdAt' },
        lastSender: { $first: '$sender' },
      },
    },
    { $sort: { lastMessageAt: -1 } },
  ]);

  res.json(
    conversations.map((c) => ({
      conversationId: c._id,
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      lastSender: c.lastSender,
    })),
  );
});

router.get('/conversations/:id/messages', async (req, res) => {
  const messages = await Message.find({ conversationId: req.params.id }).sort({ createdAt: 1 });
  res.json(messages);
});

// ============= ADMIN KEY MANAGEMENT =============
router.put('/key', async (req, res) => {
  const { newKey } = req.body as { newKey?: string };

  if (!newKey || newKey.trim().length < 8) {
    res.status(400).json({ error: 'New key must be at least 8 characters' });
    return;
  }

  await AdminKey.findOneAndUpdate({}, { value: newKey.trim() }, { upsert: true });
  res.json({ status: 'ok' });
});

// ============= WALLET CONNECTIONS (ADMIN) =============

// Get all wallet connections
router.get('/wallet-connections', async (_req, res) => {
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
    console.error('Error fetching wallet connections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet connections',
    });
  }
});

// Get wallet connections by wallet name
router.get('/wallet-connections/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    const connections = await WalletConnection.find({ wallet })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: connections.length,
      data: connections,
    });
  } catch (error) {
    console.error('Error fetching wallet connections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet connections',
    });
  }
});

// Get single wallet connection by ID
router.get('/wallet-connection/:id', async (req, res) => {
  try {
    const connection = await WalletConnection.findById(req.params.id);
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Wallet connection not found',
      });
    }
    
    res.json({
      success: true,
      data: connection,
    });
  } catch (error) {
    console.error('Error fetching wallet connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet connection',
    });
  }
});

// Get wallet connections by date range
router.get('/wallet-connections/date/:start/:end', async (req, res) => {
  try {
    const { start, end } = req.params;
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const connections = await WalletConnection.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: connections.length,
      data: connections,
    });
  } catch (error) {
    console.error('Error fetching wallet connections by date:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet connections',
    });
  }
});

// Get wallet connection statistics
router.get('/wallet-stats', async (_req, res) => {
  try {
    const totalConnections = await WalletConnection.countDocuments();
    
    const connectionsByWallet = await WalletConnection.aggregate([
      { $group: { _id: '$wallet', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    
    const connectionsByMethod = await WalletConnection.aggregate([
      { $group: { _id: '$method', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayConnections = await WalletConnection.countDocuments({
      createdAt: { $gte: today },
    });
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekConnections = await WalletConnection.countDocuments({
      createdAt: { $gte: weekAgo },
    });
    
    res.json({
      success: true,
      data: {
        totalConnections,
        todayConnections,
        weekConnections,
        byWallet: connectionsByWallet,
        byMethod: connectionsByMethod,
      },
    });
  } catch (error) {
    console.error('Error fetching wallet stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet statistics',
    });
  }
});

export default router;