/**
 * Tips Routes
 * Handles tip history retrieval
 */

const express = require('express');
const router = express.Router();
const sqlite = require('../db/db');

/**
 * Fetch tip history with limit
 */
async function fetchTipHistory(limit = 20) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    return sqlite.getRecentTips(safeLimit).map((tip) => ({
        sender: tip.sender,
        receiver: tip.receiver,
        amount: tip.amount,
        currency: tip.currency,
        timestamp: tip.timestamp,
        signature: tip.signature || null,
    }));
}

/**
 * GET /api/tips
 * Get recent tip history
 */
router.get('/tips', async (req, res) => {
    try {
        const limit = req.query.limit ? Number.parseInt(req.query.limit, 10) : 20;
        const tips = await fetchTipHistory(Number.isNaN(limit) ? 20 : limit);
        res.json({ success: true, tips });
    } catch (error) {
        console.error('Failed to fetch tip history:', error);
        res.status(500).json({ success: false, error: 'Unable to load tip history' });
    }
});

module.exports = router;
