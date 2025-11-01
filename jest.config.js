/**
 * Jest Configuration for JustTheTip
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js',
  ],

  // Coverage collection
  collectCoverageFrom: [
    'contracts/**/*.js',
    'src/**/*.js',
    'chains/**/*.js',
    'db/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**',
  ],

  // Coverage thresholds (optional - uncomment to enforce)
  // coverageThreshold: {
  //   global: {
  //     branches: 70,
  //     functions: 70,
  //     lines: 70,
  //     statements: 70,
  //   },
  // },

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Setup files
  // setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Test timeout (30 seconds for blockchain operations)
  testTimeout: 30000,
};
