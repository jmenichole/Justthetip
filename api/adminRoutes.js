/**
 * Admin Dashboard API Routes
 * 
 * RESTful API endpoints for admin analytics and reward tracking.
 * Provides insights into tipping activity, top tokens, and user engagement.
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * 
 * This file is part of JustTheTip.
 * 
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * See LICENSE file in the project root for full license information.
 * 
 * SPDX-License-Identifier: MIT
 * 
 * This software may not be sold commercially without permission.
 * 
 * @module AdminRoutes
 * @author JustTheTip Bot Team
 */

const express = require('express');
const router = express.Router();

/**
 * Middleware to verify admin access
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function requireAdmin(req, res, next) {
  const adminSecret = req.headers['x-admin-secret'];
  
  if (!adminSecret || adminSecret !== process.env.SUPER_ADMIN_SECRET) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin authentication required',
    });
  }
  
  next();
}

/**
 * GET /api/admin/stats
 * Get overall bot statistics
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    if (!db || !db.pool) {
      return res.json({
        totalUsers: 0,
        totalTips: 0,
        totalVolume: 0,
        activeToday: 0,
        message: 'Demo mode - no database connected',
      });
    }

    // Get total users
    const usersResult = await db.pool.query('SELECT COUNT(DISTINCT user_id) as count FROM users');
    
    // Get total tips
    const tipsResult = await db.pool.query(`
      SELECT COUNT(*) as count, SUM(amount) as volume
      FROM transactions
      WHERE transaction_type = 'tip' AND status = 'completed'
    `);
    
    // Get active users today
    const todayResult = await db.pool.query(`
      SELECT COUNT(DISTINCT sender_id) as count
      FROM transactions
      WHERE transaction_type = 'tip' 
        AND status = 'completed'
        AND created_at >= CURRENT_DATE
    `);

    res.json({
      totalUsers: parseInt(usersResult.rows[0]?.count || 0),
      totalTips: parseInt(tipsResult.rows[0]?.count || 0),
      totalVolume: parseFloat(tipsResult.rows[0]?.volume || 0),
      activeToday: parseInt(todayResult.rows[0]?.count || 0),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/top-tokens
 * Get top tokens tipped this week
 */
router.get('/top-tokens', requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    if (!db || !db.pool) {
      return res.json({
        tokens: [
          { currency: 'SOL', volume: 1000.5, count: 150 },
          { currency: 'USDC', volume: 500.25, count: 75 },
        ],
        message: 'Demo mode - mock data',
      });
    }

    const result = await db.pool.query(`
      SELECT 
        currency,
        SUM(amount) as volume,
        COUNT(*) as count
      FROM transactions
      WHERE transaction_type = 'tip' 
        AND status = 'completed'
        AND created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY currency
      ORDER BY volume DESC
    `);

    res.json({
      tokens: result.rows.map(row => ({
        currency: row.currency,
        volume: parseFloat(row.volume),
        count: parseInt(row.count),
      })),
    });
  } catch (error) {
    console.error('Top tokens error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/recent-activity
 * Get recent tipping activity
 */
router.get('/recent-activity', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const db = req.app.locals.db;
    
    if (!db || !db.pool) {
      return res.json({
        activity: [],
        message: 'Demo mode - no database connected',
      });
    }

    const result = await db.pool.query(`
      SELECT 
        transaction_id,
        transaction_type,
        sender_id,
        recipient_id,
        amount,
        currency,
        status,
        created_at
      FROM transactions
      WHERE transaction_type IN ('tip', 'airdrop')
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    res.json({
      activity: result.rows.map(row => ({
        id: row.transaction_id,
        type: row.transaction_type,
        sender: row.sender_id,
        recipient: row.recipient_id,
        amount: parseFloat(row.amount),
        currency: row.currency,
        status: row.status,
        timestamp: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/user/:userId
 * Get detailed user information
 */
router.get('/user/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const db = req.app.locals.db;
    
    if (!db || !db.pool) {
      return res.json({
        user: null,
        message: 'Demo mode - no database connected',
      });
    }

    // Get user balances
    const balancesResult = await db.pool.query(
      'SELECT currency, amount FROM balances WHERE user_id = $1',
      [userId]
    );

    // Get user transaction stats
    const statsResult = await db.pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE sender_id = $1) as tips_sent,
        COUNT(*) FILTER (WHERE recipient_id = $1) as tips_received,
        SUM(amount) FILTER (WHERE sender_id = $1) as total_sent,
        SUM(amount) FILTER (WHERE recipient_id = $1) as total_received
      FROM transactions
      WHERE (sender_id = $1 OR recipient_id = $1)
        AND transaction_type = 'tip'
        AND status = 'completed'
    `, [userId]);

    res.json({
      user: {
        userId,
        balances: balancesResult.rows.reduce((acc, row) => {
          acc[row.currency] = parseFloat(row.amount);
          return acc;
        }, {}),
        stats: {
          tipsSent: parseInt(statsResult.rows[0]?.tips_sent || 0),
          tipsReceived: parseInt(statsResult.rows[0]?.tips_received || 0),
          totalSent: parseFloat(statsResult.rows[0]?.total_sent || 0),
          totalReceived: parseFloat(statsResult.rows[0]?.total_received || 0),
        },
      },
    });
  } catch (error) {
    console.error('User details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/daily-stats
 * Get daily tipping statistics for the last 30 days
 */
router.get('/daily-stats', requireAdmin, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const db = req.app.locals.db;
    
    if (!db || !db.pool) {
      return res.json({
        stats: [],
        message: 'Demo mode - no database connected',
      });
    }

    const result = await db.pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as tip_count,
        SUM(amount) as volume,
        COUNT(DISTINCT sender_id) as unique_tippers
      FROM transactions
      WHERE transaction_type = 'tip' 
        AND status = 'completed'
        AND created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [days]);

    res.json({
      stats: result.rows.map(row => ({
        date: row.date,
        tipCount: parseInt(row.tip_count),
        volume: parseFloat(row.volume),
        uniqueTippers: parseInt(row.unique_tippers),
      })),
    });
  } catch (error) {
    console.error('Daily stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
