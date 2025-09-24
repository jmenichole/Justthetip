#!/usr/bin/env node

require('dotenv').config();
const https = require('https');

const API_KEY = process.env.STACKAPPS_API_KEY;

console.log('🔧 Testing StackApps API Key...');
console.log(`API Key: ${API_KEY}`);

// Test API call to get basic info
const testUrl = `https://api.stackexchange.com/2.3/info?site=stackoverflow&key=${API_KEY}`;

console.log('\n📡 Making test API call...');

https.get(testUrl, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            
            if (response.items && response.items.length > 0) {
                const info = response.items[0];
                console.log('\n✅ API Key is working!');
                console.log(`📊 Stack Overflow Stats:`);
                console.log(`   • Total Questions: ${info.total_questions?.toLocaleString() || 'N/A'}`);
                console.log(`   • Total Answers: ${info.total_answers?.toLocaleString() || 'N/A'}`);
                console.log(`   • Total Users: ${info.total_users?.toLocaleString() || 'N/A'}`);
                console.log(`   • API Version: ${info.api_revision || 'N/A'}`);
                
                console.log('\n🎯 Available endpoints you can use:');
                console.log('   • Questions: /questions');
                console.log('   • Answers: /answers');
                console.log('   • Users: /users');
                console.log('   • Search: /search');
                console.log('   • Tags: /tags');
                
                console.log(`\n📈 Rate Limits:`);
                console.log(`   • Quota Remaining: ${response.quota_remaining || 'N/A'}`);
                console.log(`   • Quota Max: ${response.quota_max || 'N/A'}`);
                
            } else {
                console.log('❌ API returned empty response');
                console.log('Response:', response);
            }
            
        } catch (error) {
            console.error('❌ Error parsing API response:', error.message);
            console.log('Raw response:', data);
        }
    });
    
}).on('error', (error) => {
    console.error('❌ API request failed:', error.message);
});

console.log('\n📚 Documentation:');
console.log('• API Docs: https://api.stackexchange.com/docs');
console.log('• Rate Limits: 10,000 requests per day');
console.log('• Throttle: 30 requests per second');
