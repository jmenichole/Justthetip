const winston = require('winston');

// Security-focused rate limiter with different limits for different command types
class SecurityRateLimiter {
    constructor() {
        this.userLimits = new Map(); // userId -> { commandType -> { count, resetTime } }
        this.globalLimits = new Map(); // command -> { count, resetTime }
        
        // Define rate limits by command type (per minute)
        this.limits = {
            // Financial commands - very strict
            tip: { userLimit: 5, globalLimit: 100, window: 60000 }, // 5 tips per user per minute
            withdraw: { userLimit: 2, globalLimit: 50, window: 60000 }, // 2 withdrawals per user per minute
            airdrop: { userLimit: 1, globalLimit: 10, window: 60000 }, // 1 airdrop per user per minute
            
            // Balance commands - moderate
            balance: { userLimit: 10, globalLimit: 500, window: 60000 },
            deposit: { userLimit: 5, globalLimit: 200, window: 60000 },
            
            // Other commands - lenient
            help: { userLimit: 20, globalLimit: 1000, window: 60000 },
            tutorial: { userLimit: 10, globalLimit: 500, window: 60000 },
            demo: { userLimit: 3, globalLimit: 100, window: 60000 }
        };
        
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'security.log' }),
                new winston.transports.Console()
            ]
        });
    }
    
    // Check if user can execute command
    checkRateLimit(userId, commandName) {
        const now = Date.now();
        const commandLimits = this.limits[commandName];
        
        if (!commandLimits) {
            // Allow unlimited for unknown commands but log it
            this.logger.warn('Unknown command for rate limiting', { userId, commandName });
            return { allowed: true };
        }
        
        // Check user-specific rate limit
        const userCheck = this._checkUserLimit(userId, commandName, now, commandLimits);
        if (!userCheck.allowed) {
            this.logger.warn('User rate limit exceeded', { 
                userId, 
                commandName, 
                remainingTime: userCheck.resetIn 
            });
            return userCheck;
        }
        
        // Check global rate limit
        const globalCheck = this._checkGlobalLimit(commandName, now, commandLimits);
        if (!globalCheck.allowed) {
            this.logger.warn('Global rate limit exceeded', { 
                commandName, 
                remainingTime: globalCheck.resetIn 
            });
            return globalCheck;
        }
        
        // Both checks passed, increment counters
        this._incrementCounters(userId, commandName, now, commandLimits);
        
        return { allowed: true };
    }
    
    _checkUserLimit(userId, commandName, now, limits) {
        if (!this.userLimits.has(userId)) {
            this.userLimits.set(userId, new Map());
        }
        
        const userCommands = this.userLimits.get(userId);
        const userCommand = userCommands.get(commandName);
        
        if (!userCommand || now >= userCommand.resetTime) {
            return { allowed: true };
        }
        
        if (userCommand.count >= limits.userLimit) {
            return { 
                allowed: false, 
                type: 'user',
                resetIn: userCommand.resetTime - now,
                limit: limits.userLimit
            };
        }
        
        return { allowed: true };
    }
    
    _checkGlobalLimit(commandName, now, limits) {
        const globalCommand = this.globalLimits.get(commandName);
        
        if (!globalCommand || now >= globalCommand.resetTime) {
            return { allowed: true };
        }
        
        if (globalCommand.count >= limits.globalLimit) {
            return { 
                allowed: false, 
                type: 'global',
                resetIn: globalCommand.resetTime - now,
                limit: limits.globalLimit
            };
        }
        
        return { allowed: true };
    }
    
    _incrementCounters(userId, commandName, now, limits) {
        // Increment user counter
        const userCommands = this.userLimits.get(userId);
        const userCommand = userCommands.get(commandName);
        
        if (!userCommand || now >= userCommand.resetTime) {
            userCommands.set(commandName, {
                count: 1,
                resetTime: now + limits.window
            });
        } else {
            userCommand.count++;
        }
        
        // Increment global counter
        const globalCommand = this.globalLimits.get(commandName);
        
        if (!globalCommand || now >= globalCommand.resetTime) {
            this.globalLimits.set(commandName, {
                count: 1,
                resetTime: now + limits.window
            });
        } else {
            globalCommand.count++;
        }
    }
    
    // Clean up expired entries (call periodically)
    cleanup() {
        const now = Date.now();
        
        // Clean up user limits
        for (const [userId, userCommands] of this.userLimits.entries()) {
            for (const [commandName, data] of userCommands.entries()) {
                if (now >= data.resetTime) {
                    userCommands.delete(commandName);
                }
            }
            if (userCommands.size === 0) {
                this.userLimits.delete(userId);
            }
        }
        
        // Clean up global limits
        for (const [commandName, data] of this.globalLimits.entries()) {
            if (now >= data.resetTime) {
                this.globalLimits.delete(commandName);
            }
        }
    }
    
    // Get remaining limits for user
    getRemainingLimits(userId, commandName) {
        const now = Date.now();
        const commandLimits = this.limits[commandName];
        
        if (!commandLimits) return null;
        
        const userCommands = this.userLimits.get(userId);
        const userCommand = userCommands?.get(commandName);
        const globalCommand = this.globalLimits.get(commandName);
        
        const userRemaining = !userCommand || now >= userCommand.resetTime ? 
            commandLimits.userLimit : 
            Math.max(0, commandLimits.userLimit - userCommand.count);
            
        const globalRemaining = !globalCommand || now >= globalCommand.resetTime ? 
            commandLimits.globalLimit : 
            Math.max(0, commandLimits.globalLimit - globalCommand.count);
            
        return {
            userRemaining,
            globalRemaining,
            userLimit: commandLimits.userLimit,
            globalLimit: commandLimits.globalLimit
        };
    }
}

module.exports = SecurityRateLimiter;