#!/usr/bin/env node

require('dotenv').config();
const https = require('https');

class StackExchangeAPI {
    constructor() {
        this.apiKey = process.env.STACKAPPS_API_KEY;
        this.baseUrl = 'api.stackexchange.com';
        this.version = '2.3';
    }

    async makeRequest(endpoint, params = {}) {
        return new Promise((resolve, reject) => {
            // Add API key to params
            params.key = this.apiKey;
            
            // Build query string
            const queryString = Object.keys(params)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
                .join('&');
            
            const path = `/${this.version}${endpoint}?${queryString}`;
            
            const options = {
                hostname: this.baseUrl,
                port: 443,
                path: path,
                method: 'GET',
                headers: {
                    'User-Agent': 'JustTheTip Discord Bot/1.0',
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        resolve(response);
                    } catch (error) {
                        reject(new Error(`JSON Parse Error: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });
            
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    async getInfo(site = 'stackoverflow') {
        return await this.makeRequest('/info', { site });
    }

    async searchQuestions(query, site = 'stackoverflow', options = {}) {
        const params = {
            order: 'desc',
            sort: 'relevance',
            intitle: query,
            site,
            ...options
        };
        return await this.makeRequest('/search', params);
    }

    async getQuestions(site = 'stackoverflow', options = {}) {
        const params = {
            order: 'desc',
            sort: 'activity',
            site,
            ...options
        };
        return await this.makeRequest('/questions', params);
    }

    async getAnswers(questionId, site = 'stackoverflow') {
        return await this.makeRequest(`/questions/${questionId}/answers`, { 
            site,
            order: 'desc',
            sort: 'votes',
            filter: 'withbody'
        });
    }
}

// Test the API
async function testAPI() {
    console.log('🔧 StackExchange API Integration Test');
    console.log(`📋 API Key: ${process.env.STACKAPPS_API_KEY}`);
    
    const api = new StackExchangeAPI();
    
    try {
        console.log('\n1️⃣ Testing API connection...');
        const info = await api.getInfo();
        
        if (info.items && info.items.length > 0) {
            const siteInfo = info.items[0];
            console.log('✅ API is working!');
            console.log(`📊 Stack Overflow Info:`);
            console.log(`   • Total Questions: ${siteInfo.total_questions?.toLocaleString()}`);
            console.log(`   • Total Answers: ${siteInfo.total_answers?.toLocaleString()}`);
            console.log(`   • Total Users: ${siteInfo.total_users?.toLocaleString()}`);
            console.log(`   • Quota Remaining: ${info.quota_remaining?.toLocaleString()}`);
            console.log(`   • Quota Max: ${info.quota_max?.toLocaleString()}`);
        }
        
        console.log('\n2️⃣ Testing question search...');
        const searchResults = await api.searchQuestions('javascript discord bot', 'stackoverflow', { pagesize: 3 });
        
        if (searchResults.items && searchResults.items.length > 0) {
            console.log(`✅ Found ${searchResults.items.length} questions:`);
            searchResults.items.forEach((q, i) => {
                console.log(`   ${i+1}. ${q.title}`);
                console.log(`      Score: ${q.score} | Answers: ${q.answer_count} | Views: ${q.view_count}`);
            });
        }
        
        console.log('\n🎯 Integration ready! You can now use:');
        console.log('   • Search programming questions');
        console.log('   • Get answers for debugging');
        console.log('   • Find code examples');
        console.log('   • Integration with Discord commands');
        
    } catch (error) {
        console.error('❌ API Test failed:', error.message);
        
        if (error.message.includes('JSON Parse')) {
            console.log('\n🔍 Troubleshooting:');
            console.log('   • API might be rate limited');
            console.log('   • Check if API key is valid');
            console.log('   • Try again in a few minutes');
        }
    }
}

// Export for use in other modules
module.exports = StackExchangeAPI;

// Run test if called directly
if (require.main === module) {
    testAPI();
}
