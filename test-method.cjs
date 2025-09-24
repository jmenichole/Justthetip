const { JustTheTipSDK } = require('./contracts/sdk.cjs');
const sdk = new JustTheTipSDK('https://api.devnet.solana.com');
console.log('Method exists:', !!sdk.createEscrowAirdropTransaction);
