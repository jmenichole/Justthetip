const winston = require('winston');
const path = require('path');

class SecurityLogger {
    constructor() {
        // Create multiple loggers for different security events
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ 
                    filename: path.join(__dirname, '..', 'logs', 'security.log'),
                    level: 'info',
                    maxsize: 10485760, // 10MB
                    maxFiles: 5,
                    tailable: true
                }),
                new winston.transports.File({ 
                    filename: path.join(__dirname, '..', 'logs', 'security-error.log'),
                    level: 'error',
                    maxsize: 10485760, // 10MB
                    maxFiles: 5,
                    tailable: true
                })
            ]
        });
        
        // Add console logging in development
        if (process.env.NODE_ENV !== 'production') {
            this.logger.add(new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            }));
        }
        
        // Security event types
        this.eventTypes = {
            RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
            TRANSACTION_LIMIT_EXCEEDED: 'TRANSACTION_LIMIT_EXCEEDED',
            INVALID_INPUT: 'INVALID_INPUT',
            SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
            UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
            COMMAND_EXECUTION: 'COMMAND_EXECUTION',
            AUTHENTICATION_FAILURE: 'AUTHENTICATION_FAILURE',
            LARGE_TRANSACTION: 'LARGE_TRANSACTION',
            FAILED_VALIDATION: 'FAILED_VALIDATION',
            SECURITY_CHECK_FAILED: 'SECURITY_CHECK_FAILED'
        };
        
        // Alert thresholds
        this.alertThresholds = {
            failedAttempts: { count: 5, window: 300000 }, // 5 failures in 5 minutes
            largeTransactions: { amount: 1000, window: 3600000 }, // $1000+ in 1 hour
            suspiciousPatterns: { count: 3, window: 600000 } // 3 suspicious attempts in 10 minutes
        };
        
        // Alert tracking
        this.alerts = new Map(); // userId -> { eventType -> { count, firstSeen, lastSeen } }
    }
    
    // Log security event
    logSecurityEvent(eventType, details) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            eventType,
            timestamp,
            ...details
        };
        
        // Log based on severity
        if (this.isHighSeverityEvent(eventType)) {
            this.logger.error('High severity security event', logEntry);
        } else if (this.isModerateSeverityEvent(eventType)) {
            this.logger.warn('Moderate severity security event', logEntry);
        } else {
            this.logger.info('Security event', logEntry);
        }
        
        // Check if this should trigger an alert
        this.checkForAlerts(eventType, details);
        
        return logEntry;
    }
    
    // Check if event type is high severity
    isHighSeverityEvent(eventType) {
        const highSeverityEvents = [
            this.eventTypes.UNAUTHORIZED_ACCESS,
            this.eventTypes.SUSPICIOUS_ACTIVITY,
            this.eventTypes.AUTHENTICATION_FAILURE,
            this.eventTypes.SECURITY_CHECK_FAILED
        ];
        return highSeverityEvents.includes(eventType);
    }
    
    // Check if event type is moderate severity
    isModerateSeverityEvent(eventType) {
        const moderateSeverityEvents = [
            this.eventTypes.RATE_LIMIT_EXCEEDED,
            this.eventTypes.TRANSACTION_LIMIT_EXCEEDED,
            this.eventTypes.LARGE_TRANSACTION,
            this.eventTypes.FAILED_VALIDATION
        ];
        return moderateSeverityEvents.includes(eventType);
    }
    
    // Log rate limit violation
    logRateLimitViolation(userId, commandName, details) {
        return this.logSecurityEvent(this.eventTypes.RATE_LIMIT_EXCEEDED, {
            userId,
            commandName,
            userAgent: details.userAgent,
            ipAddress: details.ipAddress,
            attemptedAction: details.attemptedAction,
            remainingCooldown: details.remainingCooldown
        });
    }
    
    // Log transaction limit violation
    logTransactionLimitViolation(userId, commandName, amount, details) {
        return this.logSecurityEvent(this.eventTypes.TRANSACTION_LIMIT_EXCEEDED, {
            userId,
            commandName,
            amount,
            limitType: details.limitType, // 'daily', 'hourly', 'global'
            currentUsage: details.currentUsage,
            limit: details.limit,
            resetTime: details.resetTime
        });
    }
    
    // Log invalid input attempt
    logInvalidInput(userId, commandName, input, reason) {
        return this.logSecurityEvent(this.eventTypes.INVALID_INPUT, {
            userId,
            commandName,
            inputType: typeof input,
            inputLength: String(input).length,
            reason,
            sanitizedInput: String(input).substring(0, 100) // Log first 100 chars for analysis
        });
    }
    
    // Log suspicious activity
    logSuspiciousActivity(userId, activityType, details) {
        return this.logSecurityEvent(this.eventTypes.SUSPICIOUS_ACTIVITY, {
            userId,
            activityType,
            severity: details.severity || 'medium',
            description: details.description,
            detectedPatterns: details.detectedPatterns,
            riskScore: details.riskScore
        });
    }
    
    // Log command execution
    logCommandExecution(userId, commandName, success, details = {}) {
        return this.logSecurityEvent(this.eventTypes.COMMAND_EXECUTION, {
            userId,
            commandName,
            success,
            executionTime: details.executionTime,
            parameters: details.parameters ? Object.keys(details.parameters) : [],
            result: success ? 'success' : 'failure',
            errorCode: details.errorCode,
            errorMessage: details.errorMessage
        });
    }
    
    // Log large transaction
    logLargeTransaction(userId, amount, commandName, details) {
        return this.logSecurityEvent(this.eventTypes.LARGE_TRANSACTION, {
            userId,
            amount,
            commandName,
            recipientId: details.recipientId,
            blockchain: details.blockchain,
            transactionHash: details.transactionHash,
            flaggedReason: 'large_amount'
        });
    }
    
    // Check for alert conditions
    checkForAlerts(eventType, details) {
        const userId = details.userId;
        if (!userId) return;
        
        const now = Date.now();
        
        if (!this.alerts.has(userId)) {
            this.alerts.set(userId, new Map());
        }
        
        const userAlerts = this.alerts.get(userId);
        
        // Update alert tracking
        if (!userAlerts.has(eventType)) {
            userAlerts.set(eventType, {
                count: 1,
                firstSeen: now,
                lastSeen: now
            });
        } else {
            const alert = userAlerts.get(eventType);
            alert.count++;
            alert.lastSeen = now;
        }
        
        // Check thresholds
        this.evaluateAlertThresholds(userId, eventType, userAlerts.get(eventType));
    }
    
    // Evaluate if alert thresholds are met
    evaluateAlertThresholds(userId, eventType, alertData) {
        const now = Date.now();
        const windowStart = now - this.getWindowForEventType(eventType);
        
        // Only alert if within the time window
        if (alertData.firstSeen < windowStart) {
            return;
        }
        
        const threshold = this.getThresholdForEventType(eventType);
        if (alertData.count >= threshold) {
            this.triggerSecurityAlert(userId, eventType, alertData);
        }
    }
    
    // Get time window for event type
    getWindowForEventType(eventType) {
        switch (eventType) {
            case this.eventTypes.RATE_LIMIT_EXCEEDED:
            case this.eventTypes.INVALID_INPUT:
            case this.eventTypes.FAILED_VALIDATION:
                return this.alertThresholds.failedAttempts.window;
            case this.eventTypes.LARGE_TRANSACTION:
                return this.alertThresholds.largeTransactions.window;
            case this.eventTypes.SUSPICIOUS_ACTIVITY:
                return this.alertThresholds.suspiciousPatterns.window;
            default:
                return 300000; // 5 minutes default
        }
    }
    
    // Get threshold count for event type
    getThresholdForEventType(eventType) {
        switch (eventType) {
            case this.eventTypes.RATE_LIMIT_EXCEEDED:
            case this.eventTypes.INVALID_INPUT:
            case this.eventTypes.FAILED_VALIDATION:
                return this.alertThresholds.failedAttempts.count;
            case this.eventTypes.SUSPICIOUS_ACTIVITY:
                return this.alertThresholds.suspiciousPatterns.count;
            default:
                return 5; // Default threshold
        }
    }
    
    // Trigger security alert
    triggerSecurityAlert(userId, eventType, alertData) {
        const alertDetails = {
            userId,
            eventType,
            alertLevel: 'HIGH',
            eventCount: alertData.count,
            timeWindow: alertData.lastSeen - alertData.firstSeen,
            firstSeen: new Date(alertData.firstSeen).toISOString(),
            lastSeen: new Date(alertData.lastSeen).toISOString(),
            recommendation: this.getRecommendationForEventType(eventType)
        };
        
        this.logger.error('SECURITY ALERT TRIGGERED', alertDetails);
        
        // Here you could also send notifications to admins, Discord channels, etc.
        this.notifyAdmins(alertDetails);
    }
    
    // Get recommendation for event type
    getRecommendationForEventType(eventType) {
        const recommendations = {
            [this.eventTypes.RATE_LIMIT_EXCEEDED]: 'Consider temporary user suspension or increased monitoring',
            [this.eventTypes.INVALID_INPUT]: 'Investigate potential injection attack attempts',
            [this.eventTypes.SUSPICIOUS_ACTIVITY]: 'Manual review recommended - potential malicious user',
            [this.eventTypes.LARGE_TRANSACTION]: 'Verify legitimacy of large transactions',
            [this.eventTypes.UNAUTHORIZED_ACCESS]: 'Immediate investigation required - potential breach'
        };
        
        return recommendations[eventType] || 'Monitor user activity closely';
    }
    
    // Notify admins (placeholder for notification system)
    async notifyAdmins(alertDetails) {
        // This could send notifications to:
        // - Discord admin channel
        // - Email alerts
        // - Webhook notifications
        // - SMS alerts for critical events
        
        this.logger.info('Admin notification sent', { alertId: Date.now(), userId: alertDetails.userId });
    }
    
    // Get security statistics
    getSecurityStats(timeWindow = 3600000) { // 1 hour default
        const now = Date.now();
        const stats = {
            timeWindow,
            totalEvents: 0,
            eventsByType: {},
            uniqueUsers: new Set(),
            alertsTriggered: 0,
            topRiskyUsers: []
        };
        
        // This would typically query log files or database
        // For now, return basic structure
        return stats;
    }
    
    // Clean up old alert data
    cleanupAlerts() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        for (const [userId, userAlerts] of this.alerts.entries()) {
            for (const [eventType, alertData] of userAlerts.entries()) {
                if (now - alertData.lastSeen > maxAge) {
                    userAlerts.delete(eventType);
                }
            }
            if (userAlerts.size === 0) {
                this.alerts.delete(userId);
            }
        }
    }
}

module.exports = SecurityLogger;