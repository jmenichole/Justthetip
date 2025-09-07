#!/usr/bin/env node

const http = require('http');
const https = require('https');
const dns = require('dns');
const { promisify } = require('util');

const lookup = promisify(dns.lookup);
const resolve = promisify(dns.resolve);

class DomainDiagnostic {
    constructor(domain) {
        this.domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        this.port = 80;
        this.secure = false;
        
        if (domain.startsWith('https://')) {
            this.port = 443;
            this.secure = true;
        }
    }

    async checkDNS() {
        console.log('🔍 DNS Resolution Check...');
        try {
            const result = await lookup(this.domain);
            console.log(`✅ DNS resolves to: ${result.address} (${result.family === 4 ? 'IPv4' : 'IPv6'})`);
            
            // Check A records
            try {
                const aRecords = await resolve(this.domain, 'A');
                console.log(`📋 A Records: ${aRecords.join(', ')}`);
            } catch (e) {
                console.log('❌ No A records found');
            }
            
            return result;
        } catch (error) {
            console.log(`❌ DNS Resolution failed: ${error.message}`);
            return null;
        }
    }

    async checkPort() {
        console.log(`\n🔌 Port ${this.port} Connectivity Check...`);
        
        return new Promise((resolve) => {
            const client = this.secure ? https : http;
            
            const options = {
                hostname: this.domain,
                port: this.port,
                path: '/',
                method: 'GET',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Domain-Diagnostic-Tool/1.0'
                }
            };

            const req = client.request(options, (res) => {
                console.log(`✅ Port ${this.port} is accessible`);
                console.log(`📊 Status: ${res.statusCode} ${res.statusMessage}`);
                console.log(`🌐 Headers:`);
                Object.entries(res.headers).forEach(([key, value]) => {
                    console.log(`   ${key}: ${value}`);
                });
                
                if (res.statusCode === 504) {
                    console.log('\n🚨 504 Gateway Timeout Detected!');
                    this.diagnose504(res.headers);
                }
                
                resolve(res.statusCode);
            });

            req.on('timeout', () => {
                console.log(`❌ Request timeout after 10 seconds`);
                req.destroy();
                resolve('TIMEOUT');
            });

            req.on('error', (error) => {
                console.log(`❌ Connection failed: ${error.message}`);
                if (error.code === 'ECONNREFUSED') {
                    console.log('   → Server is not listening on this port');
                } else if (error.code === 'ENOTFOUND') {
                    console.log('   → Domain does not exist or DNS issue');
                } else if (error.code === 'ECONNRESET') {
                    console.log('   → Connection was reset by server');
                }
                resolve(error.code);
            });

            req.end();
        });
    }

    diagnose504(headers) {
        console.log('\n🔧 504 Diagnostic Analysis:');
        
        // Check for common reverse proxy headers
        if (headers['server']) {
            console.log(`🖥️  Server: ${headers['server']}`);
            
            if (headers['server'].includes('cloudflare')) {
                console.log('   → Using Cloudflare (common cause of 504s)');
            } else if (headers['server'].includes('nginx')) {
                console.log('   → Using Nginx reverse proxy');
            } else if (headers['server'].includes('apache')) {
                console.log('   → Using Apache server');
            }
        }

        if (headers['cf-ray']) {
            console.log(`☁️  Cloudflare Ray ID: ${headers['cf-ray']}`);
        }

        console.log('\n💡 Common 504 Solutions:');
        console.log('1. 🔄 Server Restart: Your backend server may be down');
        console.log('2. ⏱️  Timeout Settings: Increase proxy timeout values');
        console.log('3. 🔧 Process Issues: Check if your Node.js process is hanging');
        console.log('4. 💾 Resource Issues: Server may be out of memory/CPU');
        console.log('5. 🌐 DNS Issues: CDN/proxy cant reach your origin server');
    }

    async fullDiagnostic() {
        console.log(`🏥 DOMAIN DIAGNOSTIC: ${this.domain}`);
        console.log(`🔗 Protocol: ${this.secure ? 'HTTPS' : 'HTTP'}`);
        console.log(`📍 Port: ${this.port}`);
        console.log('='.repeat(50));

        await this.checkDNS();
        const status = await this.checkPort();
        
        console.log('\n📋 SUMMARY:');
        if (status === 504) {
            console.log('❌ 504 Gateway Timeout - Server not responding');
            console.log('\n🚨 IMMEDIATE ACTIONS:');
            console.log('• Check if your Node.js processes are running');
            console.log('• Restart your web server');
            console.log('• Check server logs for errors');
            console.log('• Verify proxy/CDN configuration');
        } else if (status === 'TIMEOUT') {
            console.log('❌ Connection timeout - Server may be down');
        } else if (typeof status === 'number' && status < 400) {
            console.log('✅ Domain is responding normally');
        } else {
            console.log(`⚠️  Server returned status: ${status}`);
        }
    }
}

// Usage
const domain = process.argv[2];
if (!domain) {
    console.log('Usage: node domain_504_diagnostic.js <domain>');
    console.log('Example: node domain_504_diagnostic.js example.com');
    console.log('Example: node domain_504_diagnostic.js https://example.com');
    process.exit(1);
}

const diagnostic = new DomainDiagnostic(domain);
diagnostic.fullDiagnostic().catch(console.error);
