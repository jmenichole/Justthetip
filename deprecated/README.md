# Deprecated Code

This directory contains deprecated code that is no longer actively maintained but kept for reference purposes.

## Files

### bot.js.legacy
**Status:** Deprecated as of 2025  
**Reason:** Replaced by bot_smart_contract.js (non-custodial implementation)

The legacy `bot.js` was a custodial Discord bot that managed user funds. This approach has been superseded by the non-custodial smart contract implementation in `bot_smart_contract.js`.

**Why it was deprecated:**
- Custodial approach (bot held user funds) - security risk
- Does not align with web3 principles (users should control their own keys)
- Replaced by trustless agent technology using Solana smart contracts

**Current bot:** Use `bot_smart_contract.js` for the modern, non-custodial implementation.

## Note
Files in this directory can be recovered from git history if needed. They are kept here only for historical reference and should not be used in production.
