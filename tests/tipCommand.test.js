describe('handleTipCommand', () => {
  beforeEach(() => {
    process.env.X402_PAYER_SECRET = '2'.repeat(88);
    jest.resetModules();
  });

  it('transfers funds and updates reputation when both users are verified', async () => {
    const { handleTipCommand } = require('../src/commands/tipCommand');
    const sender = { id: 'sender', username: 'Alice' };
    const recipient = { id: 'receiver', username: 'Bob', bot: false };

    const interaction = {
      user: sender,
      options: {
        getUser: jest.fn(() => recipient),
        getNumber: jest.fn(() => 1.5),
        getString: jest.fn(() => 'SOL'),
      },
      reply: jest.fn(),
      deferReply: jest.fn(),
      editReply: jest.fn(),
    };

    const x402Mock = {
      sendPayment: jest.fn().mockResolvedValue({ signature: 'sig123' }),
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

    await handleTipCommand(interaction, {
      x402Client: x402Mock,
      trustBadgeService: trustBadgeMock,
      sqlite: sqliteMock,
    });

    expect(interaction.deferReply).toHaveBeenCalled();
    expect(x402Mock.sendPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        toAddress: 'wallet-receiver',
        amountLamports: expect.any(Number),
      }),
    );
    expect(trustBadgeMock.requireBadge).toHaveBeenCalledTimes(2);
    expect(trustBadgeMock.adjustReputation).toHaveBeenNthCalledWith(1, 'sender', 1);
    expect(trustBadgeMock.adjustReputation).toHaveBeenNthCalledWith(2, 'receiver', 2);
    expect(sqliteMock.recordTip).toHaveBeenCalledWith('sender', 'receiver', 1.5, 'SOL', 'sig123');
    expect(interaction.editReply).toHaveBeenCalled();
  });
});
