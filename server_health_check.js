#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');

console.log('🏥 SERVER HEALTH CHECK');
console.log('='.repeat(40));

// Check running processes
console.log('\n1️⃣ Active Node.js Processes:');
exec('ps aux | grep node | grep -v grep', (error, stdout) => {
    if (stdout) {
        const processes = stdout.split('\n').filter(line => line.trim());
        processes.forEach((proc, i) => {
            const parts = proc.split(/\s+/);
            const pid = parts[1];
            const cpu = parts[2];
            const mem = parts[3];
            const command = parts.slice(10).join(' ');
            if (command) {
                console.log(`   ${i+1}. PID ${pid} - CPU: ${cpu}% MEM: ${mem}% - ${command.substring(0, 80)}`);
            }
        });
    } else {
        console.log('   ❌ No Node.js processes found');
    }
});

// Check system resources
console.log('\n2️⃣ System Resources:');
exec('top -l 1 -n 0 | grep "CPU usage"', (error, stdout) => {
    if (stdout) {
        console.log(`   💻 ${stdout.trim()}`);
    }
});

exec('vm_stat | head -4', (error, stdout) => {
    if (stdout) {
        console.log('   💾 Memory Usage:');
        stdout.split('\n').forEach(line => {
            if (line.trim()) console.log(`      ${line.trim()}`);
        });
    }
});

// Check network connections
setTimeout(() => {
    console.log('\n3️⃣ Network Connections:');
    exec('lsof -i -P | grep LISTEN | head -10', (error, stdout) => {
        if (stdout) {
            stdout.split('\n').forEach(line => {
                if (line.includes('LISTEN')) {
                    console.log(`   🔌 ${line.trim()}`);
                }
            });
        } else {
            console.log('   ❌ No listening services found');
        }
    });

    // Check recent errors
    setTimeout(() => {
        console.log('\n4️⃣ Recent Error Logs:');
        const logFiles = ['mainnet.log', 'error.log', 'app.log', 'server.log'];
        
        logFiles.forEach(logFile => {
            if (fs.existsSync(logFile)) {
                console.log(`   📋 ${logFile}:`);
                exec(`tail -5 ${logFile}`, (error, stdout) => {
                    if (stdout) {
                        stdout.split('\n').forEach(line => {
                            if (line.trim()) console.log(`      ${line.trim()}`);
                        });
                    }
                });
            }
        });

        setTimeout(() => {
            console.log('\n🔧 COMMON 504 FIXES:');
            console.log('• Restart server: pm2 restart all OR kill <pid> && npm start');
            console.log('• Check memory: free -h (Linux) or vm_stat (macOS)');
            console.log('• Check disk space: df -h');
            console.log('• Review proxy config: nginx/apache/cloudflare settings');
            console.log('• Increase timeout limits in reverse proxy');
            console.log('• Check if SSL certificate is valid');
        }, 1000);
    }, 1000);
}, 1000);
