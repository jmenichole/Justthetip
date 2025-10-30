const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const REQUIRED_ENV_VARS = ['BOT_TOKEN', 'CLIENT_ID'];

function loadEnv() {
  const projectRoot = path.resolve(__dirname, '../../');
  const envPath = path.join(projectRoot, '.env');
  let envFileExists = false;
  try {
    envFileExists = fs.statSync(envPath).isFile();
  } catch (error) {
    envFileExists = false;
  }

  if (envFileExists) {
    dotenv.config({ path: envPath, override: false });
    return;
  }

  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = loadEnv;
