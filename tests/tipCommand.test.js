/**
 * JustTheTip - Tip Command Tests
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * 
 * This file is part of JustTheTip.
 * 
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * See LICENSE file in the project root for full license information.
 * 
 * SPDX-License-Identifier: MIT
 * 
 * This software may not be sold commercially without permission.
 */

describe('handleTipCommand', () => {
  beforeEach(() => {
    // Valid base58 encoded secret key for testing (generated keypair)
    process.env.X402_PAYER_SECRET = '3ef9mWKpS3dfkJgfA8SPpP8Uc9Hhrw4ZsFWvuPGBBy3M2TrFMQuMQihUmBhPPWuTK1sDpofi9yqZuFy8tX3tnMJK';
    jest.resetModules();
  });

  it('transfers funds with fee deduction and updates reputation when both users are verified', async () => {
    const { handleTipCommand } = require('../src/commands/tipCommand');
    const sender = { id: 'sender', username: 'Alice' };
    const recipient = { id: 'receiver', username: 'Bob', bot: false };

    const interaction = {
      user: sender,
      options: {
        getUser: jest.fn(() => recipient),
        getString: jest.fn((key) => {
          if (key === 'amount') return '1.5';
          return null;
        }),
      },
      reply: jest.fn(),
      deferReply: jest.fn(),
      editReply: jest.fn(),
    };

    const x402Mock = {
      sendPayment: jest.fn()
        .mockResolvedValueOnce({ signature: 'sig123' }) // Main payment
        .mockResolvedValueOnce({ signature: 'feesig456' }), // Fee payment
    };

    const trustBadgeMock = {
      requireBadge: jest
        .fn()
        .mockResolvedValueOnce({ wallet_address: 'wallet-sender', mint_address: 'mint-sender' })
        .mockResolvedValueOnce({ wallet_address: 'wallet-receiver', mint_address: 'mint-receiver' }),
      adjustReputation: jest.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(8),
    };

    const sqliteMock = {
      getUser: jest.fn(),
      recordTip: jest.fn(),
    };

    const priceServiceMock = {
      convertUsdToSol: jest.fn().mockResolvedValue(0.5), // Not used for SOL amounts
    };

    await handleTipCommand(interaction, {
      x402Client: x402Mock,
      trustBadgeService: trustBadgeMock,
      sqlite: sqliteMock,
      priceService: priceServiceMock,
    });

    expect(interaction.deferReply).toHaveBeenCalled();
    
    // Check that sendPayment was called twice (once for recipient, once for fee)
    expect(x402Mock.sendPayment).toHaveBeenCalledTimes(2);
    
    // First call should be for the net amount to recipient (1.5 - 0.5% fee = 1.4925)
    expect(x402Mock.sendPayment).toHaveBeenNthCalledWith(1, 
      expect.objectContaining({
        toAddress: 'wallet-receiver',
        amountLamports: expect.any(Number),
        reference: 'tip:sender:receiver',
      })
    );
    
    // Second call should be for the fee to fee wallet
    expect(x402Mock.sendPayment).toHaveBeenNthCalledWith(2,
      expect.objectContaining({
        toAddress: 'H8m2gN2GEPSbk4u6PoWa8JYkEZRJWH45DyWjbAm76uCX',
        amountLamports: expect.any(Number),
        reference: 'fee:sender:receiver',
      })
    );
    
    expect(trustBadgeMock.requireBadge).toHaveBeenCalledTimes(2);
    expect(trustBadgeMock.adjustReputation).toHaveBeenNthCalledWith(1, 'sender', 1);
    expect(trustBadgeMock.adjustReputation).toHaveBeenNthCalledWith(2, 'receiver', 2);
    expect(sqliteMock.recordTip).toHaveBeenCalledWith('sender', 'receiver', 1.5, 'SOL', 'sig123');
    expect(interaction.editReply).toHaveBeenCalled();
  });

  it('converts USD to SOL when amount starts with $', async () => {
    const { handleTipCommand } = require('../src/commands/tipCommand');
    const sender = { id: 'sender', username: 'Alice' };
    const recipient = { id: 'receiver', username: 'Bob', bot: false };

    const interaction = {
      user: sender,
      options: {
        getUser: jest.fn(() => recipient),
        getString: jest.fn((key) => {
          if (key === 'amount') return '$10';
          return null;
        }),
      },
      reply: jest.fn(),
      deferReply: jest.fn(),
      editReply: jest.fn(),
    };

    const x402Mock = {
      sendPayment: jest.fn()
        .mockResolvedValueOnce({ signature: 'sig123' })
        .mockResolvedValueOnce({ signature: 'feesig456' }),
    };

    const trustBadgeMock = {
      requireBadge: jest
        .fn()
        .mockResolvedValueOnce({ wallet_address: 'wallet-sender', mint_address: 'mint-sender' })
        .mockResolvedValueOnce({ wallet_address: 'wallet-receiver', mint_address: 'mint-receiver' }),
      adjustReputation: jest.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(8),
    };

    const sqliteMock = {
      getUser: jest.fn(),
      recordTip: jest.fn(),
    };

    const priceServiceMock = {
      convertUsdToSol: jest.fn().mockResolvedValue(0.5), // $10 = 0.5 SOL at $20/SOL
    };

    await handleTipCommand(interaction, {
      x402Client: x402Mock,
      trustBadgeService: trustBadgeMock,
      sqlite: sqliteMock,
      priceService: priceServiceMock,
    });

    expect(interaction.deferReply).toHaveBeenCalled();
    expect(priceServiceMock.convertUsdToSol).toHaveBeenCalledWith(10);
    expect(x402Mock.sendPayment).toHaveBeenCalledTimes(2);
    expect(interaction.editReply).toHaveBeenCalled();
  });

  it('rejects invalid amounts', async () => {
    const { handleTipCommand } = require('../src/commands/tipCommand');
    const sender = { id: 'sender', username: 'Alice' };
    const recipient = { id: 'receiver', username: 'Bob', bot: false };

    const interaction = {
      user: sender,
      options: {
        getUser: jest.fn(() => recipient),
        getString: jest.fn((key) => {
          if (key === 'amount') return '-5';
          return null;
        }),
      },
      reply: jest.fn(),
      deferReply: jest.fn(),
      editReply: jest.fn(),
    };

    await handleTipCommand(interaction, {});

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('❌ Amount must be a positive number'),
        ephemeral: true,
      })
    );
  });

  it('prevents self-tipping', async () => {
    const { handleTipCommand } = require('../src/commands/tipCommand');
    const sender = { id: 'sender', username: 'Alice' };

    const interaction = {
      user: sender,
      options: {
        getUser: jest.fn(() => sender),
        getString: jest.fn((key) => {
          if (key === 'amount') return '1.5';
          return null;
        }),
      },
      reply: jest.fn(),
      deferReply: jest.fn(),
      editReply: jest.fn(),
    };

    await handleTipCommand(interaction, {});

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('😅 You cannot tip yourself'),
        ephemeral: true,
      })
    );
  });

  it('rejects tip when sender is not verified', async () => {
    const { handleTipCommand } = require('../src/commands/tipCommand');
    const sender = { id: 'sender', username: 'Alice' };
    const recipient = { id: 'receiver', username: 'Bob', bot: false };

    const interaction = {
      user: sender,
      options: {
        getUser: jest.fn(() => recipient),
        getString: jest.fn((key) => {
          if (key === 'amount') return '1.5';
          return null;
        }),
      },
      reply: jest.fn(),
      deferReply: jest.fn(),
      editReply: jest.fn(),
    };

    const trustBadgeMock = {
      requireBadge: jest.fn().mockRejectedValue(new Error('User is not verified with a TrustBadge NFT yet.')),
    };

    await handleTipCommand(interaction, {
      trustBadgeService: trustBadgeMock,
    });

    expect(interaction.deferReply).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('❌ You need to register your wallet'),
      })
    );
  });

  it('rejects tip when recipient is not verified', async () => {
    const { handleTipCommand } = require('../src/commands/tipCommand');
    const sender = { id: 'sender', username: 'Alice' };
    const recipient = { id: 'receiver', username: 'Bob', bot: false, createDM: jest.fn().mockResolvedValue({ send: jest.fn() }) };

    const interaction = {
      user: sender,
      options: {
        getUser: jest.fn(() => recipient),
        getString: jest.fn((key) => {
          if (key === 'amount') return '1.5';
          return null;
        }),
      },
      reply: jest.fn(),
      deferReply: jest.fn(),
      editReply: jest.fn(),
    };

    const trustBadgeMock = {
      requireBadge: jest
        .fn()
        .mockResolvedValueOnce({ wallet_address: 'wallet-sender', mint_address: 'mint-sender' })
        .mockRejectedValueOnce(new Error('User is not verified. Please use /register-wallet to link your Solana wallet.')),
    };

    const sqliteMock = {
      getUser: jest.fn(),
      createPendingTip: jest.fn().mockReturnValue({
        id: 1,
        sender_id: 'sender',
        receiver_id: 'receiver',
        amount: 1.5,
        currency: 'SOL',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
      markPendingTipNotified: jest.fn(),
    };

    const priceServiceMock = {
      convertUsdToSol: jest.fn(),
    };

    await handleTipCommand(interaction, {
      trustBadgeService: trustBadgeMock,
      sqlite: sqliteMock,
      priceService: priceServiceMock,
    });

    expect(interaction.deferReply).toHaveBeenCalled();
    expect(sqliteMock.createPendingTip).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: '💌 Tip Pending - User Not Registered',
            }),
          }),
        ]),
      })
    );
  });

  it('handles "all" keyword to send full balance', async () => {
    const { handleTipCommand } = require('../src/commands/tipCommand');
    const sender = { id: 'sender', username: 'Alice' };
    const recipient = { id: 'receiver', username: 'Bob', bot: false };

    const interaction = {
      user: sender,
      options: {
        getUser: jest.fn(() => recipient),
        getString: jest.fn((key) => {
          if (key === 'amount') return 'all';
          return null;
        }),
      },
      reply: jest.fn(),
      deferReply: jest.fn(),
      editReply: jest.fn(),
    };

    const x402Mock = {
      getBalance: jest.fn().mockResolvedValue({
        lamports: 2000000000, // 2 SOL in lamports
        sol: 2.0,
      }),
      sendPayment: jest.fn()
        .mockResolvedValueOnce({ signature: 'sig123' }) // Main payment
        .mockResolvedValueOnce({ signature: 'feesig456' }), // Fee payment
    };

    const trustBadgeMock = {
      requireBadge: jest
        .fn()
        .mockResolvedValueOnce({ wallet_address: 'wallet-sender', mint_address: 'mint-sender' })
        .mockResolvedValueOnce({ wallet_address: 'wallet-receiver', mint_address: 'mint-receiver' }),
      adjustReputation: jest.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(8),
    };

    const sqliteMock = {
      getUser: jest.fn(),
      recordTip: jest.fn(),
    };

    const priceServiceMock = {
      convertUsdToSol: jest.fn().mockResolvedValue(0.5),
    };

    await handleTipCommand(interaction, {
      x402Client: x402Mock,
      trustBadgeService: trustBadgeMock,
      sqlite: sqliteMock,
      priceService: priceServiceMock,
    });

    expect(interaction.deferReply).toHaveBeenCalled();
    expect(x402Mock.getBalance).toHaveBeenCalled();
    
    // Should send payment with balance minus fee reserve (2.0 - 0.001 = 1.999)
    expect(x402Mock.sendPayment).toHaveBeenCalledTimes(2);
    expect(sqliteMock.recordTip).toHaveBeenCalledWith('sender', 'receiver', 1.999, 'SOL', 'sig123');
    expect(interaction.editReply).toHaveBeenCalled();
  });
});
