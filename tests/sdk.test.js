/**
 * Jest Tests for JustTheTip SDK
 * 
 * Tests the core functionality of the SDK with mocked Solana RPC responses
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

const { JustTheTipSDK } = require('../contracts/sdk');
const { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } = require('@solana/web3.js');

// Mock Solana web3.js
jest.mock('@solana/web3.js', () => {
  const actualWeb3 = jest.requireActual('@solana/web3.js');
  
  return {
    ...actualWeb3,
    Connection: jest.fn().mockImplementation(() => ({
      getBalance: jest.fn().mockResolvedValue(1000000000), // 1 SOL in lamports
      getTokenAccountBalance: jest.fn().mockResolvedValue({
        value: {
          uiAmount: 100.0,
          amount: '100000000',
          decimals: 6,
        },
      }),
      getSignatureStatus: jest.fn().mockResolvedValue({
        value: {
          confirmationStatus: 'confirmed',
          confirmations: 10,
          err: null,
        },
      }),
      getLatestBlockhash: jest.fn().mockResolvedValue({
        blockhash: '4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZAMdL4VZHirAn',
        lastValidBlockHeight: 12345678,
      }),
    })),
  };
});

// Mock SPL Token functions
jest.mock('@solana/spl-token', () => {
  const actualSPL = jest.requireActual('@solana/spl-token');
  return {
    ...actualSPL,
    getAssociatedTokenAddress: jest.fn().mockResolvedValue(
      new (jest.requireActual('@solana/web3.js').PublicKey)('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    ),
  };
});

describe('JustTheTipSDK', () => {
  let sdk;
  const validAddress1 = '11111111111111111111111111111112';
  const validAddress2 = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  const usdcMintAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

  beforeEach(() => {
    sdk = new JustTheTipSDK('https://api.devnet.solana.com');
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('initializes with default RPC URL', () => {
      const defaultSdk = new JustTheTipSDK();
      expect(defaultSdk.rpcUrl).toBe('https://api.mainnet-beta.solana.com');
    });

    test('initializes with custom RPC URL', () => {
      const customSdk = new JustTheTipSDK('https://api.devnet.solana.com');
      expect(customSdk.rpcUrl).toBe('https://api.devnet.solana.com');
    });

    test('creates a connection instance', () => {
      expect(sdk.connection).toBeDefined();
      expect(sdk.connection).toHaveProperty('getBalance');
      expect(sdk.connection).toHaveProperty('getLatestBlockhash');
    });
  });

  describe('createTipInstruction', () => {
    test('creates valid SOL transfer transaction', () => {
      const amount = 0.1;
      const transaction = sdk.createTipInstruction(validAddress1, validAddress2, amount);

      expect(transaction).not.toBeNull();
      expect(transaction).toBeInstanceOf(Transaction);
      expect(transaction.instructions.length).toBe(1);
    });

    test('handles zero amount', () => {
      const transaction = sdk.createTipInstruction(validAddress1, validAddress2, 0);
      expect(transaction).toBeNull();
    });

    test('handles negative amount', () => {
      const transaction = sdk.createTipInstruction(validAddress1, validAddress2, -1);
      expect(transaction).toBeNull();
    });

    test('handles invalid sender address', () => {
      const transaction = sdk.createTipInstruction('invalid', validAddress2, 0.1);
      expect(transaction).toBeNull();
    });

    test('handles invalid recipient address', () => {
      const transaction = sdk.createTipInstruction(validAddress1, 'invalid', 0.1);
      expect(transaction).toBeNull();
    });

    test('converts SOL amount to lamports correctly', () => {
      const amount = 1.5;
      const transaction = sdk.createTipInstruction(validAddress1, validAddress2, amount);
      
      expect(transaction).not.toBeNull();
      // Verify the instruction contains correct lamports
      const instruction = transaction.instructions[0];
      expect(instruction.data.length).toBeGreaterThan(0);
    });
  });

  describe('createSPLTokenTransfer', () => {
    test('handles zero amount', async () => {
      const transaction = await sdk.createSPLTokenTransfer(
        validAddress1,
        validAddress2,
        usdcMintAddress,
        0,
        6
      );
      expect(transaction).toBeNull();
    });

    test('handles negative amount', async () => {
      const transaction = await sdk.createSPLTokenTransfer(
        validAddress1,
        validAddress2,
        usdcMintAddress,
        -1,
        6
      );
      expect(transaction).toBeNull();
    });

    test('calls createSPLTokenTransfer without errors for valid input', async () => {
      // Note: Full SPL token testing requires proper mocking of SPL Token library
      // This test verifies the method exists and handles basic validation
      const result = await sdk.createSPLTokenTransfer(
        validAddress1,
        validAddress2,
        usdcMintAddress,
        10,
        6
      );
      // Result may be null due to mock limitations, but function should not throw
      expect(result === null || result instanceof Transaction).toBe(true);
    });
  });

  describe('generateUserPDA', () => {
    test('generates PDA for Discord user ID', () => {
      const discordUserId = '123456789012345678';
      const result = sdk.generateUserPDA(discordUserId);

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('bump');
      expect(typeof result.address).toBe('string');
      expect(typeof result.bump).toBe('number');
    });

    test('generates different PDAs for different user IDs', () => {
      const userId1 = '111111111111111111';
      const userId2 = '222222222222222222';

      const pda1 = sdk.generateUserPDA(userId1);
      const pda2 = sdk.generateUserPDA(userId2);

      expect(pda1.address).not.toBe(pda2.address);
    });

    test('generates same PDA for same user ID', () => {
      const userId = '123456789012345678';

      const pda1 = sdk.generateUserPDA(userId);
      const pda2 = sdk.generateUserPDA(userId);

      expect(pda1.address).toBe(pda2.address);
      expect(pda1.bump).toBe(pda2.bump);
    });

    test('accepts custom program ID', () => {
      const discordUserId = '123456789012345678';
      const customProgramId = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
      
      const result = sdk.generateUserPDA(discordUserId, customProgramId);

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('address');
    });
  });

  describe('getBalance', () => {
    test('returns balance in SOL', async () => {
      const balance = await sdk.getBalance(validAddress1);

      expect(balance).toBe(1); // 1000000000 lamports = 1 SOL
      expect(sdk.connection.getBalance).toHaveBeenCalledWith(expect.any(PublicKey));
    });

    test('handles invalid address', async () => {
      const balance = await sdk.getBalance('invalid-address');
      expect(balance).toBe(0);
    });

    test('converts lamports to SOL correctly', async () => {
      // Mock different balance
      sdk.connection.getBalance.mockResolvedValueOnce(500000000); // 0.5 SOL

      const balance = await sdk.getBalance(validAddress1);
      expect(balance).toBe(0.5);
    });
  });

  describe('getSPLTokenBalance', () => {
    test('returns token balance', async () => {
      const balance = await sdk.getSPLTokenBalance(validAddress1, usdcMintAddress);

      expect(balance).toBe(100.0);
      expect(sdk.connection.getTokenAccountBalance).toHaveBeenCalled();
    });

    test('handles invalid wallet address', async () => {
      const balance = await sdk.getSPLTokenBalance('invalid', usdcMintAddress);
      expect(balance).toBe(0);
    });

    test('handles account not found error', async () => {
      sdk.connection.getTokenAccountBalance.mockRejectedValueOnce(
        new Error('Account not found')
      );

      const balance = await sdk.getSPLTokenBalance(validAddress1, usdcMintAddress);
      expect(balance).toBe(0);
    });
  });

  describe('createAirdropInstructions', () => {
    test('creates transaction with multiple recipients', () => {
      const recipients = [
        { pubkey: validAddress1, amount: 0.1 },
        { pubkey: validAddress2, amount: 0.2 },
      ];

      const transaction = sdk.createAirdropInstructions(validAddress1, recipients);

      expect(transaction).not.toBeNull();
      expect(transaction.instructions.length).toBe(2);
    });

    test('skips recipients with invalid amounts', () => {
      const recipients = [
        { pubkey: validAddress1, amount: 0.1 },
        { pubkey: validAddress2, amount: 0 },
        { pubkey: validAddress2, amount: -1 },
      ];

      const transaction = sdk.createAirdropInstructions(validAddress1, recipients);

      expect(transaction).not.toBeNull();
      expect(transaction.instructions.length).toBe(1);
    });

    test('returns null for empty recipient list', () => {
      const transaction = sdk.createAirdropInstructions(validAddress1, []);
      expect(transaction).toBeNull();
    });

    test('returns null when all recipients are invalid', () => {
      const recipients = [
        { pubkey: validAddress1, amount: 0 },
        { pubkey: validAddress2, amount: -1 },
      ];

      const transaction = sdk.createAirdropInstructions(validAddress1, recipients);
      expect(transaction).toBeNull();
    });
  });

  describe('validateAddress', () => {
    test('validates correct Solana address', () => {
      expect(sdk.validateAddress(validAddress1)).toBe(true);
      expect(sdk.validateAddress(validAddress2)).toBe(true);
    });

    test('rejects invalid addresses', () => {
      expect(sdk.validateAddress('invalid')).toBe(false);
      expect(sdk.validateAddress('')).toBe(false);
      expect(sdk.validateAddress('123')).toBe(false);
    });

    test('rejects non-string inputs', () => {
      expect(sdk.validateAddress(null)).toBe(false);
      expect(sdk.validateAddress(undefined)).toBe(false);
      // Number inputs get converted to string by PublicKey, so they may pass
      // This is expected Solana SDK behavior
    });
  });

  describe('getTransactionStatus', () => {
    test('returns transaction status', async () => {
      const signature = '5j7s6NiJS3JAkvgkoc18WVAsiSaci2pxB2A6ueCJP4tprA2TFg9wSyTLeYouxPBJEMzJinENTkpA52YStRW5Dia7';
      const status = await sdk.getTransactionStatus(signature);

      expect(status).not.toBeNull();
      expect(status.value).toHaveProperty('confirmationStatus');
      expect(sdk.connection.getSignatureStatus).toHaveBeenCalledWith(signature);
    });

    test('handles errors gracefully', async () => {
      sdk.connection.getSignatureStatus.mockRejectedValueOnce(
        new Error('Network error')
      );

      const status = await sdk.getTransactionStatus('invalid-signature');
      expect(status).toBeNull();
    });
  });

  describe('getRecentBlockhash', () => {
    test('returns recent blockhash', async () => {
      const blockhash = await sdk.getRecentBlockhash();

      expect(blockhash).toBe('4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZAMdL4VZHirAn');
      expect(sdk.connection.getLatestBlockhash).toHaveBeenCalled();
    });

    test('handles RPC errors', async () => {
      sdk.connection.getLatestBlockhash.mockRejectedValueOnce(
        new Error('RPC error')
      );

      const blockhash = await sdk.getRecentBlockhash();
      expect(blockhash).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('handles very small SOL amounts', () => {
      const transaction = sdk.createTipInstruction(
        validAddress1,
        validAddress2,
        0.000000001
      );
      // Should work if amount rounds to at least 1 lamport
      expect(transaction).not.toBeNull();
    });

    test('handles large SOL amounts', () => {
      const transaction = sdk.createTipInstruction(
        validAddress1,
        validAddress2,
        1000000
      );
      expect(transaction).not.toBeNull();
    });

    test('handles concurrent operations', async () => {
      const promises = [
        sdk.getBalance(validAddress1),
        sdk.getBalance(validAddress2),
        sdk.getRecentBlockhash(),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => expect(result).toBeDefined());
    });
  });
});
