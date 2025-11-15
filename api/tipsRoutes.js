/**
 * JustTheTip - Tips Routes
 * Handles tip history retrieval
 * 
 * Copyright (c) 2025 JustTheTip Bot. All rights reserved.
 * 
 * This file is part of JustTheTip.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 * See LICENSE file in the project root for full license information.
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
