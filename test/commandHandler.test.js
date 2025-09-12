const commandHandler = require('../src/commands/commandHandler');
const db = require('../db/database');

jest.mock('../db/database', () => ({
  getBalances: jest.fn(() => ({ SOL: 0, USDC: 0, LTC: 0, BTC: 0, BCH: 0 })),
  processTip: jest.fn(),
  processWithdrawal: jest.fn(),
  createAirdrop: jest.fn(),
  collectAirdrop: jest.fn(() => 'No available airdrops to collect.'),
  processBurn: jest.fn(),
  getBalance: jest.fn(() => 0),
}));

// Mock message object
function mockMessage(content, authorId = 'testuser') {
  return {
    content,
    author: { id: authorId, send: jest.fn() },
    reply: jest.fn(),
    channel: { type: 0 },
  };
}

describe('Command Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should reject invalid tip command', async () => {
    const msg = mockMessage('!tip @user notanumber sol');
    await commandHandler.handleCommand(msg);
    expect(msg.reply).toHaveBeenCalledWith('Invalid amount or unsupported coin');
  });

  test('should reject invalid airdrop command', async () => {
    const msg = mockMessage('!airdrop notanumber sol');
    await commandHandler.handleCommand(msg);
    expect(msg.reply).toHaveBeenCalledWith('Invalid amount or unsupported coin');
  });

  test('should reject invalid withdraw command', async () => {
    const msg = mockMessage('!withdraw badaddress 1 sol');
    await commandHandler.handleCommand(msg);
    expect(msg.reply).toHaveBeenCalledWith('Invalid address or amount');
  });

  test('should process a valid tip command', async () => {
    const msg = mockMessage('!tip @user 1 sol');
    await commandHandler.handleCommand(msg);
    expect(db.processTip).toHaveBeenCalledWith('testuser', '@user', '1', 'SOL');
    expect(msg.reply).toHaveBeenCalledWith('Tip sent successfully!');
  });

  test('should process a valid airdrop command', async () => {
    const msg = mockMessage('!airdrop 2 ltc');
    await commandHandler.handleCommand(msg);
    expect(db.createAirdrop).toHaveBeenCalledWith('testuser', '2', 'LTC');
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Airdrop created!'));
  });

  test('should process a valid withdraw command', async () => {
    const msg = mockMessage('!withdraw 1 sol');
    await commandHandler.handleCommand(msg);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Your balance has been updated'));
  });

  test('should process a valid burn command', async () => {
    const msg = mockMessage('!burn sol');
    await commandHandler.handleCommand(msg);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Donate'));
  });

  test('should handle collect when no airdrops', async () => {
    const msg = mockMessage('!collect');
    await commandHandler.handleCommand(msg);
    expect(msg.reply).toHaveBeenCalledWith('No available airdrops to collect.');
  });

  // Add more tests for other commands as needed
});
