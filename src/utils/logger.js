/**
 * JustTheTip - Logger Utility Module
 * Logging functionality for JustTheTip bot
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
 */

const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'justthetip-bot' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;