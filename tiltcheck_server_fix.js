#!/usr/bin/env node

const http = require('http');
const https = require('https');
const fs = require('fs');

console.log('🔧 TiltCheck Server Recovery Tool');
console.log('==================================');

// First, let's check what might be expected to run
const possiblePorts = [3000, 8080, 4000, 5000, 8000, 3001];

console.log('\n1️⃣ Checking common ports for existing servers...');

possiblePorts.forEach(port => {
    const server = http.createServer();
    server.listen(port, () => {
        console.log(`❌ Port ${port} is available (nothing running)`);
        server.close();
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`✅ Port ${port} is in use (something running)`);
        } else {
            console.log(`❓ Port ${port}: ${err.message}`);
        }
    });
});

// Create a simple server to test
setTimeout(() => {
    console.log('\n2️⃣ Creating emergency TiltCheck server...');
    
    const server = http.createServer((req, res) => {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TiltCheck - Responsible Gambling Monitor</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255,255,255,0.1);
            padding: 2rem;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        h1 { text-align: center; margin-bottom: 2rem; }
        .status { 
            background: rgba(0,255,0,0.2); 
            padding: 1rem; 
            border-radius: 8px; 
            margin: 1rem 0;
            border-left: 4px solid #00ff00;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin: 2rem 0;
        }
        .feature {
            background: rgba(255,255,255,0.1);
            padding: 1.5rem;
            border-radius: 10px;
            text-align: center;
        }
        .api-info {
            background: rgba(255,255,255,0.1);
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎰 TiltCheck - Responsible Gambling Monitor</h1>
        
        <div class="status">
            ✅ <strong>Server Status:</strong> Online and Running<br>
            🕐 <strong>Started:</strong> ${new Date().toLocaleString()}<br>
            🔧 <strong>Mode:</strong> Emergency Recovery Server
        </div>

        <p>TiltCheck is an advanced responsible gambling monitoring system that helps users track their gambling patterns, set limits, and maintain healthy gaming habits.</p>

        <div class="features">
            <div class="feature">
                <h3>🔍 Pattern Analysis</h3>
                <p>Monitor gambling behavior patterns and identify potential issues before they become problems.</p>
            </div>
            <div class="feature">
                <h3>💰 Spending Limits</h3>
                <p>Set and enforce daily, weekly, and monthly spending limits across multiple platforms.</p>
            </div>
            <div class="feature">
                <h3>⏰ Time Management</h3>
                <p>Track time spent gambling and receive alerts when approaching set limits.</p>
            </div>
            <div class="feature">
                <h3>📊 Real-time Analytics</h3>
                <p>View detailed reports on your gambling activity with actionable insights.</p>
            </div>
        </div>

        <div class="api-info">
            <h3>🔗 API Endpoints</h3>
            <p><strong>Health Check:</strong> <code>GET /api/health</code></p>
            <p><strong>User Stats:</strong> <code>GET /api/user/{id}/stats</code></p>
            <p><strong>Set Limits:</strong> <code>POST /api/user/{id}/limits</code></p>
            <p><strong>Discord Integration:</strong> <code>POST /api/discord/webhook</code></p>
        </div>

        <p style="text-align: center; margin-top: 2rem;">
            <strong>Need Help?</strong> Contact support or check our Discord bot for assistance.
        </p>
    </div>
</body>
</html>`;

        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*',
            'X-Powered-By': 'TiltCheck-Emergency-Server'
        });
        res.end(html);
    });

    // Try to start on port 3000 (common Next.js port)
    server.listen(3000, () => {
        console.log('✅ Emergency TiltCheck server started on port 3000');
        console.log('🌐 Your website should now be accessible!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Check if your nginx config points to port 3000');
        console.log('2. Start your actual TiltCheck application');
        console.log('3. This is just a temporary fix');
        console.log('');
        console.log('To stop this server: Ctrl+C');
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log('❓ Port 3000 is already in use');
            // Try port 8080
            server.listen(8080, () => {
                console.log('✅ Emergency server started on port 8080');
                console.log('⚠️  You may need to update your nginx config to point to port 8080');
            }).on('error', (err2) => {
                console.log(`❌ Could not start emergency server: ${err2.message}`);
            });
        } else {
            console.log(`❌ Server error: ${err.message}`);
        }
    });
}, 2000);
