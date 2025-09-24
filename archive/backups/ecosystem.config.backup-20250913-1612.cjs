module.exports = {
  apps: [{
    name: 'justthetip-working',
    script: 'working-bot-fixed.cjs',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    env: {
      NODE_ENV: 'production'
    },
    // Enhanced logging configuration
    error_file: './logs/working-err.log',
    out_file: './logs/working-out.log',
    log_file: './logs/working-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Additional production settings
    kill_timeout: 10000,
    listen_timeout: 8000,
    shutdown_with_message: true,
    
    // Environment variables
    env_production: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    }
  }, {
    name: 'justthetip-enhanced',
    script: 'enhanced-bot-fixed.cjs',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    env: {
      NODE_ENV: 'production'
    },
    // Enhanced logging configuration
    error_file: './logs/enhanced-err.log',
    out_file: './logs/enhanced-out.log',
    log_file: './logs/enhanced-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Additional production settings
    kill_timeout: 10000,
    listen_timeout: 8000,
    shutdown_with_message: true,
    
    // Environment variables
    env_production: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    }
  }]
};
