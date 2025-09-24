const winston = require('winston');

class SecurityValidator {
    constructor() {
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
        
        // Known blockchain address patterns
        this.addressPatterns = {
            solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
            bitcoin: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/,
            litecoin: /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$|^ltc1[a-z0-9]{39,59}$/,
            bitcoincash: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bitcoincash:[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{42}$/,
            dogecoin: /^[D][5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$/
        };
        
        // Suspicious patterns to flag
        this.suspiciousPatterns = [
            /script/i,
            /<.*>/,
            /javascript:/i,
            /vbscript:/i,
            /onload/i,
            /onerror/i,
            /eval\(/i,
            /function\(/i,
            /alert\(/i,
            /document\./i,
            /window\./i,
            /\$\{/,
            /`.*`/,
            /\|\|/,
            /&&/,
            /;.*\(/
        ];
    }
    
    // Validate cryptocurrency amount
    validateAmount(amount, maxAmount = 1000000) {
        try {
            // Remove whitespace and convert to string
            const amountStr = String(amount).trim();
            
            // Check for empty or non-numeric
            if (!amountStr || isNaN(amountStr)) {
                return {
                    valid: false,
                    error: 'Amount must be a valid number'
                };
            }
            
            const numAmount = parseFloat(amountStr);
            
            // Check for negative, zero, or infinite values
            if (numAmount <= 0) {
                return {
                    valid: false,
                    error: 'Amount must be greater than 0'
                };
            }
            
            if (!isFinite(numAmount)) {
                return {
                    valid: false,
                    error: 'Amount must be a finite number'
                };
            }
            
            // Check for reasonable maximum
            if (numAmount > maxAmount) {
                return {
                    valid: false,
                    error: `Amount cannot exceed ${maxAmount}`
                };
            }
            
            // Check for too many decimal places (max 8 for crypto)
            const decimalPlaces = (amountStr.split('.')[1] || '').length;
            if (decimalPlaces > 8) {
                return {
                    valid: false,
                    error: 'Amount cannot have more than 8 decimal places'
                };
            }
            
            return {
                valid: true,
                sanitizedAmount: numAmount
            };
            
        } catch (error) {
            this.logger.error('Amount validation error', { amount, error: error.message });
            return {
                valid: false,
                error: 'Invalid amount format'
            };
        }
    }
    
    // Validate blockchain address
    validateAddress(address, blockchain) {
        try {
            if (!address || typeof address !== 'string') {
                return {
                    valid: false,
                    error: 'Address must be a valid string'
                };
            }
            
            const sanitizedAddress = address.trim();
            
            // Check for empty address
            if (!sanitizedAddress) {
                return {
                    valid: false,
                    error: 'Address cannot be empty'
                };
            }
            
            // Check for suspicious patterns
            for (const pattern of this.suspiciousPatterns) {
                if (pattern.test(sanitizedAddress)) {
                    this.logger.warn('Suspicious pattern in address', { 
                        address: sanitizedAddress, 
                        pattern: pattern.source 
                    });
                    return {
                        valid: false,
                        error: 'Address contains invalid characters'
                    };
                }
            }
            
            // Check blockchain-specific pattern
            const pattern = this.addressPatterns[blockchain.toLowerCase()];
            if (!pattern) {
                return {
                    valid: false,
                    error: `Unsupported blockchain: ${blockchain}`
                };
            }
            
            if (!pattern.test(sanitizedAddress)) {
                return {
                    valid: false,
                    error: `Invalid ${blockchain} address format`
                };
            }
            
            return {
                valid: true,
                sanitizedAddress
            };
            
        } catch (error) {
            this.logger.error('Address validation error', { address, blockchain, error: error.message });
            return {
                valid: false,
                error: 'Address validation failed'
            };
        }
    }
    
    // Validate user input for general text
    validateUserInput(input, maxLength = 1000) {
        try {
            if (input === null || input === undefined) {
                return {
                    valid: false,
                    error: 'Input cannot be null or undefined'
                };
            }
            
            const inputStr = String(input).trim();
            
            // Check length
            if (inputStr.length > maxLength) {
                return {
                    valid: false,
                    error: `Input too long (max ${maxLength} characters)`
                };
            }
            
            // Check for suspicious patterns
            for (const pattern of this.suspiciousPatterns) {
                if (pattern.test(inputStr)) {
                    this.logger.warn('Suspicious pattern in user input', { 
                        input: inputStr.substring(0, 100), 
                        pattern: pattern.source 
                    });
                    return {
                        valid: false,
                        error: 'Input contains invalid characters or patterns'
                    };
                }
            }
            
            return {
                valid: true,
                sanitizedInput: inputStr
            };
            
        } catch (error) {
            this.logger.error('User input validation error', { input, error: error.message });
            return {
                valid: false,
                error: 'Input validation failed'
            };
        }
    }
    
    // Validate Discord user ID
    validateUserId(userId) {
        try {
            if (!userId) {
                return {
                    valid: false,
                    error: 'User ID is required'
                };
            }
            
            const userIdStr = String(userId);
            
            // Discord user IDs are 17-19 digit numbers
            if (!/^\d{17,19}$/.test(userIdStr)) {
                return {
                    valid: false,
                    error: 'Invalid user ID format'
                };
            }
            
            return {
                valid: true,
                sanitizedUserId: userIdStr
            };
            
        } catch (error) {
            this.logger.error('User ID validation error', { userId, error: error.message });
            return {
                valid: false,
                error: 'User ID validation failed'
            };
        }
    }
    
    // Validate transaction parameters
    validateTransaction(params) {
        const { amount, fromUserId, toUserId, blockchain, toAddress } = params;
        const errors = [];
        
        // Validate amount
        const amountValidation = this.validateAmount(amount);
        if (!amountValidation.valid) {
            errors.push(`Amount: ${amountValidation.error}`);
        }
        
        // Validate sender
        const senderValidation = this.validateUserId(fromUserId);
        if (!senderValidation.valid) {
            errors.push(`Sender: ${senderValidation.error}`);
        }
        
        // Validate recipient (either user ID or address)
        if (toUserId) {
            const recipientValidation = this.validateUserId(toUserId);
            if (!recipientValidation.valid) {
                errors.push(`Recipient: ${recipientValidation.error}`);
            }
        } else if (toAddress && blockchain) {
            const addressValidation = this.validateAddress(toAddress, blockchain);
            if (!addressValidation.valid) {
                errors.push(`Address: ${addressValidation.error}`);
            }
        } else {
            errors.push('Either recipient user ID or address with blockchain must be provided');
        }
        
        if (errors.length > 0) {
            this.logger.warn('Transaction validation failed', { params, errors });
            return {
                valid: false,
                errors
            };
        }
        
        return {
            valid: true,
            sanitizedParams: {
                amount: amountValidation.sanitizedAmount,
                fromUserId: senderValidation.sanitizedUserId,
                toUserId: toUserId ? this.validateUserId(toUserId).sanitizedUserId : null,
                toAddress: toAddress ? this.validateAddress(toAddress, blockchain).sanitizedAddress : null,
                blockchain
            }
        };
    }
    
    // Log security event
    logSecurityEvent(eventType, details) {
        this.logger.warn('Security event', { 
            eventType, 
            ...details, 
            timestamp: new Date().toISOString() 
        });
    }
}

module.exports = SecurityValidator;