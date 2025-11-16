/**
 * Test suite for Stripe Crypto Onramp Routes
 * 
 * Tests the Stripe Onramp integration endpoints
 */

const express = require('express');
const request = require('supertest');

// Mock Stripe before requiring the routes
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        crypto: {
            onrampSessions: {
                create: jest.fn().mockResolvedValue({
                    id: 'cos_test_123',
                    client_secret: 'cos_test_secret_123',
                    status: 'created',
                    transaction_details: {
                        wallet_address: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
                        destination_currency: 'sol',
                        destination_network: 'solana'
                    },
                    created: Date.now() / 1000
                }),
                retrieve: jest.fn().mockResolvedValue({
                    id: 'cos_test_123',
                    status: 'completed',
                    transaction_details: {
                        wallet_address: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
                        destination_currency: 'sol',
                        destination_network: 'solana'
                    },
                    created: Date.now() / 1000
                })
            }
        },
        webhooks: {
            constructEvent: jest.fn().mockReturnValue({
                type: 'crypto.onramp_session.updated',
                data: {
                    object: {
                        id: 'cos_test_123',
                        status: 'completed'
                    }
                }
            })
        }
    }));
});

describe('Stripe Onramp Routes', () => {
    let app;
    let stripeOnrampRoutes;

    beforeAll(() => {
        // Set up test environment variables
        process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
        process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_mock_key';
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

        // Create Express app
        app = express();
        app.use(express.json());
        
        // Load routes after environment is set
        stripeOnrampRoutes = require('../api/routes/stripeOnrampRoutes');
        app.use('/api/stripe/onramp', stripeOnrampRoutes);
    });

    afterAll(() => {
        // Clean up environment
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.STRIPE_PUBLISHABLE_KEY;
        delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    describe('GET /api/stripe/onramp/config', () => {
        it('should return configuration when Stripe is configured', async () => {
            const response = await request(app)
                .get('/api/stripe/onramp/config')
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('enabled', true);
            expect(response.body).toHaveProperty('publishableKey', 'pk_test_mock_key');
            expect(response.body).toHaveProperty('supportedNetworks');
            expect(response.body.supportedNetworks).toContain('solana');
        });
    });

    describe('POST /api/stripe/onramp/session', () => {
        // Valid Solana wallet address (44 characters - base58 encoded)
        const validWallet = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
        
        it('should create an onramp session with valid wallet address', async () => {
            const response = await request(app)
                .post('/api/stripe/onramp/session')
                .send({
                    walletAddress: validWallet,
                    destinationNetwork: 'solana',
                    destinationCurrency: 'sol'
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('clientSecret');
            expect(response.body).toHaveProperty('sessionId');
            expect(response.body).toHaveProperty('walletAddress', validWallet);
        });

        it('should reject request without wallet address', async () => {
            const response = await request(app)
                .post('/api/stripe/onramp/session')
                .send({
                    destinationNetwork: 'solana'
                })
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
        });

        it('should reject invalid Solana wallet address', async () => {
            const response = await request(app)
                .post('/api/stripe/onramp/session')
                .send({
                    walletAddress: 'invalid',
                    destinationNetwork: 'solana'
                })
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toContain('Invalid Solana wallet address');
        });

        it('should accept optional source amount', async () => {
            const response = await request(app)
                .post('/api/stripe/onramp/session')
                .send({
                    walletAddress: validWallet,
                    sourceAmount: '100',
                    sourceCurrency: 'usd',
                    destinationNetwork: 'solana'
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
        });
    });

    describe('GET /api/stripe/onramp/session/:sessionId', () => {
        it('should retrieve session status', async () => {
            const response = await request(app)
                .get('/api/stripe/onramp/session/cos_test_123')
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('session');
            expect(response.body.session).toHaveProperty('id', 'cos_test_123');
            expect(response.body.session).toHaveProperty('status');
        });

        it('should reject request without session ID', async () => {
            const response = await request(app)
                .get('/api/stripe/onramp/session/')
                .expect(404);
        });
    });

    describe('POST /api/stripe/onramp/webhook', () => {
        it('should handle webhook events with valid signature', async () => {
            const response = await request(app)
                .post('/api/stripe/onramp/webhook')
                .set('stripe-signature', 'test_signature')
                .send({
                    type: 'crypto.onramp_session.updated',
                    data: {
                        object: {
                            id: 'cos_test_123',
                            status: 'completed'
                        }
                    }
                })
                .expect(200);

            expect(response.body).toHaveProperty('received', true);
        });
    });
});

describe('Stripe Onramp Routes - Unconfigured', () => {
    let app;
    let stripeOnrampRoutes;

    beforeAll(() => {
        // Remove Stripe configuration
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.STRIPE_PUBLISHABLE_KEY;
        
        // Reload module to get unconfigured state
        jest.resetModules();
        
        // Mock Stripe to not be initialized
        jest.mock('stripe', () => {
            throw new Error('Stripe not configured');
        });

        app = express();
        app.use(express.json());
        
        // Load routes without Stripe configuration
        stripeOnrampRoutes = require('../api/routes/stripeOnrampRoutes');
        app.use('/api/stripe/onramp', stripeOnrampRoutes);
    });

    describe('GET /api/stripe/onramp/config', () => {
        it('should return disabled when Stripe is not configured', async () => {
            const response = await request(app)
                .get('/api/stripe/onramp/config')
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('enabled', false);
            expect(response.body).toHaveProperty('publishableKey', null);
        });
    });
});
