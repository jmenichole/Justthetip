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
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'justthetip-bot' },
  transports: [
    // Always log to console for Railway (Railway captures stdout/stderr)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, service, stack }) => {
          const baseMessage = `[${timestamp}] [${service}] ${level}: ${message}`;
          return stack ? `${baseMessage}\n${stack}` : baseMessage;
        })
      )
    }),
  ],
});

// Add file logging only in non-production or when explicitly enabled
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_FILE_LOGGING === 'true') {
  try {
    const fs = require('fs');
    const path = require('path');
    const logsDir = path.join(process.cwd(), 'logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
    logger.add(new winston.transports.File({ filename: 'logs/combined.log' }));
  } catch (error) {
    // If file logging fails, just continue with console logging
    console.warn('⚠️  File logging disabled:', error.message);
  }
}

module.exports = logger;