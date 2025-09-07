const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class WalletSecurity {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyDerivationIterations = 100000;
        this.encryptionKey = this.getOrCreateMasterKey();
    }

    getOrCreateMasterKey() {
        const keyPath = path.join(__dirname, '../.security/master.key');
        
        if (fs.existsSync(keyPath)) {
            return fs.readFileSync(keyPath);
        } else {
            // Create secure directory
            const securityDir = path.dirname(keyPath);
            if (!fs.existsSync(securityDir)) {
                fs.mkdirSync(securityDir, { mode: 0o700, recursive: true });
            }
            
            // Generate new master key
            const key = crypto.randomBytes(32);
            fs.writeFileSync(keyPath, key, { mode: 0o600 });
            console.log('🔑 Generated new master encryption key');
            return key;
        }
    }

    encryptPrivateKey(privateKey, userPassword = null) {
        try {
            const salt = crypto.randomBytes(16);
            const iv = crypto.randomBytes(16);
            
            // Use master key + optional user password
            let key = this.encryptionKey;
            if (userPassword) {
                key = crypto.pbkdf2Sync(userPassword, salt, this.keyDerivationIterations, 32, 'sha512');
            }
            
            const cipher = crypto.createCipher(this.algorithm, key, iv);
            
            let encrypted = cipher.update(privateKey, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
            return {
                encrypted,
                salt: salt.toString('hex'),
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex')
            };
        } catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }

    decryptPrivateKey(encryptedData, userPassword = null) {
        try {
            const { encrypted, salt, iv, authTag } = encryptedData;
            
            let key = this.encryptionKey;
            if (userPassword && salt) {
                key = crypto.pbkdf2Sync(userPassword, Buffer.from(salt, 'hex'), this.keyDerivationIterations, 32, 'sha512');
            }
            
            const decipher = crypto.createDecipher(this.algorithm, key, Buffer.from(iv, 'hex'));
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }

    validateAddress(address, blockchain = 'solana') {
        const validators = {
            solana: (addr) => {
                // Solana addresses are base58 encoded, 32-44 characters
                return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
            },
            ethereum: (addr) => {
                // Ethereum addresses are 42 characters starting with 0x
                return /^0x[a-fA-F0-9]{40}$/.test(addr);
            },
            bitcoin: (addr) => {
                // Bitcoin addresses (simplified validation)
                return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr) || 
                       /^bc1[a-z0-9]{39,59}$/.test(addr);
            }
        };
        
        const validator = validators[blockchain.toLowerCase()];
        return validator ? validator(address) : false;
    }

    generateSecurePrivateKey() {
        return crypto.randomBytes(32);
    }

    hashUserData(userData) {
        return crypto.createHash('sha256').update(userData).digest('hex');
    }

    verifySignature(message, signature, publicKey) {
        try {
            const verifier = crypto.createVerify('SHA256');
            verifier.update(message);
            return verifier.verify(publicKey, signature, 'hex');
        } catch (error) {
            return false;
        }
    }

    generateAPIKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    secureCompare(a, b) {
        return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    }
}

module.exports = { WalletSecurity };
