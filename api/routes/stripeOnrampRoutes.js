/**
 * Stripe Crypto Onramp Routes
 * Implements Stripe's embedded onramp widget for crypto purchases
 * 
 * Copyright (c) 2025 JustTheTip Bot. All rights reserved.
 */

const express = require('express');
const router = express.Router();

// Initialize Stripe with the secret key from environment
let stripe;
try {
    if (process.env.STRIPE_SECRET_KEY) {
        stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        console.log('✅ Stripe Onramp initialized');
    } else {
        console.warn('⚠️  STRIPE_SECRET_KEY not configured - Onramp disabled');
    }
} catch (error) {
    console.error('❌ Failed to initialize Stripe:', error.message);
}

/**
 * Create an Onramp Session
 * POST /api/stripe/onramp/session
 * 
 * This endpoint creates a Stripe Crypto Onramp session for purchasing crypto.
 * The session is used to initialize the embedded Onramp widget on the frontend.
 * 
 * Request body:
 * - walletAddress: The destination wallet address (Solana address)
 * - sourceAmount: Optional amount in fiat currency (e.g., "100")
 * - sourceCurrency: Optional fiat currency (e.g., "usd", defaults to "usd")
 * - destinationNetwork: Optional blockchain network (defaults to "solana")
 * - destinationCurrency: Optional crypto currency (defaults to "sol")
 * 
 * Response:
 * - success: boolean
 * - clientSecret: The client secret to initialize the Onramp widget
 * - sessionId: The session ID for tracking
 */
router.post('/session', async (req, res) => {
    try {
        // Check if Stripe is initialized
        if (!stripe) {
            return res.status(503).json({
                success: false,
                error: 'Stripe Onramp not configured',
                message: 'STRIPE_SECRET_KEY environment variable is not set'
            });
        }

        const {
            walletAddress,
            sourceAmount,
            sourceCurrency = 'usd',
            destinationNetwork = 'solana',
            destinationCurrency = 'sol'
        } = req.body;

        // Validate wallet address
        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        // Validate Solana wallet address format (basic check)
        if (destinationNetwork === 'solana' && (walletAddress.length < 32 || walletAddress.length > 44)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Solana wallet address'
            });
        }

        // Create Onramp Session configuration
        const sessionConfig = {
            transaction_details: {
                destination_currency: destinationCurrency,
                destination_network: destinationNetwork,
                destination_exchange_amount: null, // Let user choose amount
                wallet_address: walletAddress,
                lock_wallet_address: true // Prevent user from changing the wallet address
            }
        };

        // Add source amount if provided
        if (sourceAmount) {
            sessionConfig.transaction_details.source_amount = sourceAmount;
            sessionConfig.transaction_details.source_currency = sourceCurrency;
        }

        // Create the Onramp session
        const session = await stripe.crypto.onrampSessions.create(sessionConfig);

        console.log('✅ Onramp session created:', session.id);

        res.json({
            success: true,
            clientSecret: session.client_secret,
            sessionId: session.id,
            walletAddress: walletAddress,
            network: destinationNetwork
        });

    } catch (error) {
        console.error('❌ Onramp session creation error:', error);
        
        // Handle specific Stripe errors
        if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to create onramp session',
            message: error.message
        });
    }
});

/**
 * Get Onramp Session Status
 * GET /api/stripe/onramp/session/:sessionId
 * 
 * Retrieve the status of an existing onramp session.
 * Useful for checking if a purchase has been completed.
 */
router.get('/session/:sessionId', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({
                success: false,
                error: 'Stripe Onramp not configured'
            });
        }

        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Session ID is required'
            });
        }

        // Retrieve the session
        const session = await stripe.crypto.onrampSessions.retrieve(sessionId);

        res.json({
            success: true,
            session: {
                id: session.id,
                status: session.status,
                walletAddress: session.transaction_details?.wallet_address,
                destinationCurrency: session.transaction_details?.destination_currency,
                destinationNetwork: session.transaction_details?.destination_network,
                createdAt: session.created
            }
        });

    } catch (error) {
        console.error('❌ Failed to retrieve onramp session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve session',
            message: error.message
        });
    }
});

/**
 * Webhook handler for Onramp events
 * POST /api/stripe/onramp/webhook
 * 
 * Handles webhook events from Stripe for onramp sessions.
 * This allows tracking when purchases are completed.
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({
                success: false,
                error: 'Stripe Onramp not configured'
            });
        }

        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.warn('⚠️  STRIPE_WEBHOOK_SECRET not configured - webhook verification skipped');
            return res.json({ received: true });
        }

        let event;

        try {
            // Verify webhook signature
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch (err) {
            console.error('⚠️  Webhook signature verification failed:', err.message);
            return res.status(400).json({
                success: false,
                error: 'Webhook signature verification failed'
            });
        }

        // Handle the event
        console.log('📥 Stripe webhook event:', event.type);

        switch (event.type) {
            case 'crypto.onramp_session.updated': {
                const session = event.data.object;
                console.log('💰 Onramp session updated:', session.id, 'Status:', session.status);
                
                // TODO: Update database with session status
                // if (session.status === 'completed') {
                //     // Record successful purchase
                // }
                break;
            }

            case 'crypto.onramp_session.completed': {
                const completedSession = event.data.object;
                console.log('✅ Onramp session completed:', completedSession.id);
                
                // TODO: Record completed purchase in database
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('❌ Webhook handling error:', error);
        res.status(500).json({
            success: false,
            error: 'Webhook handling failed',
            message: error.message
        });
    }
});

/**
 * Get Onramp configuration
 * GET /api/stripe/onramp/config
 * 
 * Returns public configuration for the Onramp widget.
 * This endpoint is safe to call from the frontend.
 */
router.get('/config', (req, res) => {
    const isConfigured = !!process.env.STRIPE_PUBLISHABLE_KEY;
    
    res.json({
        success: true,
        enabled: isConfigured,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
        supportedNetworks: ['solana'],
        supportedCurrencies: ['sol', 'usdc'],
        defaultNetwork: 'solana',
        defaultCurrency: 'sol'
    });
});

module.exports = router;
