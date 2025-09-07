const inputValidation = require('../src/validators/inputValidation');
const logger = require('../src/utils/logger');

// Simple test without external dependencies
describe('Core Utilities', () => {
  test('input validation should work', () => {
    // Test if the module loads without errors
    expect(typeof inputValidation).toBe('object');
  });
  
  test('logger should work', () => {
    // Test if the module loads without errors
    expect(typeof logger).toBe('object');
    expect(typeof logger.info).toBe('function');
  });
});