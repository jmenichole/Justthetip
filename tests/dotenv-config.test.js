/**
 * Tests for dotenv-safe configuration
 * Ensures that bot files properly handle empty/missing optional environment variables
 */

const fs = require('fs');
const path = require('path');

describe('Dotenv Configuration', () => {
  const botFiles = [
    'bot.js',
    'bot_smart_contract.js',
    'clear-commands.js'
  ];

  test('all bot files should use allowEmptyValues: true in dotenv-safe config', () => {
    for (const file of botFiles) {
      const filePath = path.join(process.cwd(), file);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.warn(`Warning: ${file} not found, skipping test`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check if file uses dotenv-safe
      if (content.includes("require('dotenv-safe')")) {
        // Verify it includes allowEmptyValues: true (may be in try-catch)
        expect(content).toMatch(/allowEmptyValues:\s*true/);
      }
    }
  });

  test('bot_smart_contract.js should have allowEmptyValues: true to prevent MissingEnvVarsError', () => {
    const filePath = path.join(process.cwd(), 'bot_smart_contract.js');
    
    if (!fs.existsSync(filePath)) {
      throw new Error('bot_smart_contract.js not found');
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Verify the configuration includes allowEmptyValues
    expect(content).toMatch(/allowEmptyValues:\s*true/);
  });

  test('bot.js should maintain allowEmptyValues: true configuration', () => {
    const filePath = path.join(process.cwd(), 'bot.js');
    
    if (!fs.existsSync(filePath)) {
      throw new Error('bot.js not found');
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Verify the configuration includes allowEmptyValues
    expect(content).toMatch(/allowEmptyValues:\s*true/);
  });

  test('.env.example should document optional variables as commented', () => {
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    if (!fs.existsSync(envExamplePath)) {
      throw new Error('.env.example not found');
    }

    const content = fs.readFileSync(envExamplePath, 'utf-8');
    
    // Verify optional variables are documented but commented out
    // This prevents dotenv-safe from requiring them while still documenting them
    expect(content).toContain('DISCORD_REDIRECT_URI');
    expect(content).toContain('DATABASE_URL');
    
    // Verify they are commented out (prefixed with # on the actual assignment line)
    expect(content).toMatch(/# DISCORD_REDIRECT_URI=/);
    expect(content).toMatch(/# DATABASE_URL=/);
  });

  test('.env.example should only have required variables uncommented', () => {
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    if (!fs.existsSync(envExamplePath)) {
      throw new Error('.env.example not found');
    }

    const content = fs.readFileSync(envExamplePath, 'utf-8');
    
    // Required variables for smart contract bot should be uncommented
    expect(content).toMatch(/^DISCORD_BOT_TOKEN=/m);
    expect(content).toMatch(/^DISCORD_CLIENT_ID=/m);
    expect(content).toMatch(/^DISCORD_CLIENT_SECRET=/m);
    expect(content).toMatch(/^SOLANA_RPC_URL=/m);
    expect(content).toMatch(/^NODE_ENV=/m);
  });

  test('bot files should have try-catch wrapper for dotenv-safe to handle missing .env file', () => {
    const criticalBotFiles = ['bot.js', 'bot_smart_contract.js'];
    
    for (const file of criticalBotFiles) {
      const filePath = path.join(process.cwd(), file);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`Warning: ${file} not found, skipping test`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Verify try-catch wrapper exists for production deployments
      expect(content).toMatch(/try\s*{[\s\S]*require\('dotenv-safe'\)\.config/);
      expect(content).toMatch(/catch\s*\(/);
      expect(content).toMatch(/require\('dotenv'\)\.config\(\)/);
    }
  });

  test('bot files should validate required environment variables', () => {
    const criticalBotFiles = ['bot.js', 'bot_smart_contract.js'];
    
    for (const file of criticalBotFiles) {
      const filePath = path.join(process.cwd(), file);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`Warning: ${file} not found, skipping test`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Verify required variables are checked
      expect(content).toMatch(/requiredVars\s*=/);
      expect(content).toContain('DISCORD_BOT_TOKEN');
      expect(content).toContain('DISCORD_CLIENT_ID');
      expect(content).toMatch(/missingVars/);
    }
  });
});
