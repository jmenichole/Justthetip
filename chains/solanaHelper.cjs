const { PublicKey } = require('@solana/web3.js');
const { URL } = require('url');

/**
 * Creates a Solana Pay transaction link.
 * https://github.com/solana-labs/solana-pay/blob/master/SPEC.md
 *
 * @param {string} recipientAddress - The recipient's public key address.
 * @param {string} amount - The amount of the token to send.
 * @param {string} splTokenAddress - The mint address of the SPL token (e.g., USDC). Leave null for SOL.
 * @param {string} label - A label for the transaction, which will appear in the user's wallet.
 * @param {string} message - A message for the transaction.
 * @returns {URL} A Solana Pay URL object.
 */
function createSolanaPayUrl(recipientAddress, amount, splTokenAddress = null, label = 'Tip via JustTheTip', message) {
  const recipient = new PublicKey(recipientAddress);

  // Basic validation
  if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    throw new Error('Invalid amount');
  }
  if (!message) {
    throw new Error('A message is required for the transaction link.');
  }

  let url;
  if (splTokenAddress) {
    // SPL Token Transaction
    const splToken = new PublicKey(splTokenAddress);
    url = new URL(`solana:${recipient.toBase58()}`);
    url.searchParams.append('amount', amount);
    url.searchParams.append('spl-token', splToken.toBase58());
  } else {
    // SOL Transaction
    url = new URL(`solana:${recipient.toBase58()}`);
    url.searchParams.append('amount', amount);
  }

  url.searchParams.append('label', label);
  url.searchParams.append('message', message);

  return url;
}

module.exports = {
  createSolanaPayUrl,
};
