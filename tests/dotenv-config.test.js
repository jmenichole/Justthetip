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
        // Verify it includes allowEmptyValues: true
        expect(content).toMatch(/require\('dotenv-safe'\)\.config\(\s*\{\s*allowEmptyValues:\s*true\s*\}\s*\)/);
      }
    }
  });

  test('bot_smart_contract.js should have allowEmptyValues: true to prevent MissingEnvVarsError', () => {
    const filePath = path.join(process.cwd(), 'bot_smart_contract.js');
    
    if (!fs.existsSync(filePath)) {
      throw new Error('bot_smart_contract.js not found');
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Verify the specific configuration
    expect(content).toContain("require('dotenv-safe').config({ allowEmptyValues: true })");
  });

  test('bot.js should maintain allowEmptyValues: true configuration', () => {
    const filePath = path.join(process.cwd(), 'bot.js');
    
    if (!fs.existsSync(filePath)) {
      throw new Error('bot.js not found');
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Verify the specific configuration
    expect(content).toContain("require('dotenv-safe').config({ allowEmptyValues: true })");
  });

  test('.env.example should contain DISCORD_REDIRECT_URI and DATABASE_URL', () => {
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    if (!fs.existsSync(envExamplePath)) {
      throw new Error('.env.example not found');
    }

    const content = fs.readFileSync(envExamplePath, 'utf-8');
    
    // Verify required variables are documented
    expect(content).toContain('DISCORD_REDIRECT_URI');
    expect(content).toContain('DATABASE_URL');
  });
});
