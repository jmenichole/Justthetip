/**
 * Magic Routes Tests
 * Tests for Magic SDK configuration and health endpoints
 */

const request = require('supertest');
const express = require('express');
const magicRoutes = require('../api/routes/magicRoutes');

// Mock the Magic Admin SDK
jest.mock('@magic-sdk/admin', () => {
  return {
    Magic: jest.fn().mockImplementation(() => ({
      users: {
        getMetadataByToken: jest.fn()
      },
      solana: {
        getWallet: jest.fn()
      }
    }))
  };
});

describe('Magic Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/magic', magicRoutes);
  });

  afterEach(() => {
    // Clear environment variables
    delete process.env.MAGIC_PUBLISHABLE_KEY;
    delete process.env.MAGIC_SECRET_KEY;
    delete process.env.REGISTRATION_TOKEN_SECRET;
    delete process.env.MAGIC_SOLANA_NETWORK;
    delete process.env.MAGIC_SOLANA_RPC_URL;
  });

  describe('GET /api/magic/health', () => {
    test('should return magic_configured: false when no environment variables are set', async () => {
      const response = await request(app)
        .get('/api/magic/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        magic_configured: false,
        fully_configured: false,
        configuration: {
          publishable_key: false,
          secret_key: false,
          registration_token_secret: false,
          solana_network: false,
          solana_rpc_url: false
        }
      });

      expect(response.body.deployment).toBeDefined();
      expect(response.body.deployment.recommended_url).toBe('https://justthetip.vercel.app');
      expect(response.body.timestamp).toBeDefined();
    });

    test('should return magic_configured: true when required variables are set', async () => {
      process.env.MAGIC_PUBLISHABLE_KEY = 'pk_test_123';
      process.env.MAGIC_SECRET_KEY = 'sk_test_123';

      const response = await request(app)
        .get('/api/magic/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        magic_configured: true,
        fully_configured: false,
        configuration: {
          publishable_key: true,
          secret_key: true,
          registration_token_secret: false,
          solana_network: false,
          solana_rpc_url: false
        }
      });
    });

    test('should return fully_configured: true when all variables are set', async () => {
      process.env.MAGIC_PUBLISHABLE_KEY = 'pk_test_123';
      process.env.MAGIC_SECRET_KEY = 'sk_test_123';
      process.env.REGISTRATION_TOKEN_SECRET = 'test_secret';
      process.env.MAGIC_SOLANA_NETWORK = 'devnet';
      process.env.MAGIC_SOLANA_RPC_URL = 'https://api.devnet.solana.com';

      const response = await request(app)
        .get('/api/magic/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        magic_configured: true,
        fully_configured: true,
        configuration: {
          publishable_key: true,
          secret_key: true,
          registration_token_secret: true,
          solana_network: true,
          solana_rpc_url: true
        }
      });
    });

    test('should include deployment URLs in response', async () => {
      const response = await request(app)
        .get('/api/magic/health')
        .expect(200);

      expect(response.body.deployment).toMatchObject({
        recommended_url: 'https://justthetip.vercel.app',
        frontend_url: 'https://jmenichole.github.io/Justthetip',
        deprecated_urls: expect.arrayContaining([
          'api.mischief-manager.com (no longer maintained)'
        ])
      });
    });

    test('should include timestamp in response', async () => {
      const response = await request(app)
        .get('/api/magic/health')
        .expect(200);

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    test('should return magic_configured: false with only publishable key', async () => {
      process.env.MAGIC_PUBLISHABLE_KEY = 'pk_test_123';

      const response = await request(app)
        .get('/api/magic/health')
        .expect(200);

      expect(response.body.magic_configured).toBe(false);
      expect(response.body.configuration.publishable_key).toBe(true);
      expect(response.body.configuration.secret_key).toBe(false);
    });

    test('should return magic_configured: false with only secret key', async () => {
      process.env.MAGIC_SECRET_KEY = 'sk_test_123';

      const response = await request(app)
        .get('/api/magic/health')
        .expect(200);

      expect(response.body.magic_configured).toBe(false);
      expect(response.body.configuration.publishable_key).toBe(false);
      expect(response.body.configuration.secret_key).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    test('should correctly identify missing REGISTRATION_TOKEN_SECRET', async () => {
      process.env.MAGIC_PUBLISHABLE_KEY = 'pk_test_123';
      process.env.MAGIC_SECRET_KEY = 'sk_test_123';

      const response = await request(app)
        .get('/api/magic/health')
        .expect(200);

      expect(response.body.magic_configured).toBe(true);
      expect(response.body.fully_configured).toBe(false);
      expect(response.body.configuration.registration_token_secret).toBe(false);
    });

    test('should correctly identify Solana configuration', async () => {
      process.env.MAGIC_SOLANA_NETWORK = 'mainnet-beta';
      process.env.MAGIC_SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';

      const response = await request(app)
        .get('/api/magic/health')
        .expect(200);

      expect(response.body.configuration.solana_network).toBe(true);
      expect(response.body.configuration.solana_rpc_url).toBe(true);
    });
  });

  describe('Deployment URL Validation', () => {
    test('should warn about deprecated mischief-manager URLs', async () => {
      const response = await request(app)
        .get('/api/magic/health')
        .expect(200);

      const deprecatedUrls = response.body.deployment.deprecated_urls;
      expect(deprecatedUrls).toContain('api.mischief-manager.com (no longer maintained)');
    });

    test('should recommend Vercel deployment URL', async () => {
      const response = await request(app)
        .get('/api/magic/health')
        .expect(200);

      expect(response.body.deployment.recommended_url).toBe('https://justthetip.vercel.app');
    });

    test('should specify correct frontend URL', async () => {
      const response = await request(app)
        .get('/api/magic/health')
        .expect(200);

      expect(response.body.deployment.frontend_url).toBe('https://jmenichole.github.io/Justthetip');
    });
  });
});
