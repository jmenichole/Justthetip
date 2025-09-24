module.exports = {
  apps: [
    {
      name: 'justthetip-secure',
      script: './working-bot.cjs',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      env_production: {
        NODE_ENV: 'production',
        MONGODB_URI_X509: 'mongodb+srv://justhetip.0z3jtr.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=Justhetip',
        MONGODB_CERT_PATH: './certs/mongodb-cert.pem',
        MONGODB_DATABASE: 'justthetip',
        MONGODB_URI: 'mongodb+srv://jchapman7:DLpCASXtvGAqG7OH@justhetip.0z3jtr.mongodb.net/justthetip'
      },
      error_file: './logs/secure-bot-error.log',
      out_file: './logs/secure-bot-out.log',
      log_file: './logs/secure-bot-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000
    }
  ]
};
