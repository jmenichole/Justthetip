// Ethereum service using ethers.js
const { ethers } = require('ethers');
require('dotenv').config();

const ETH_RPC_URL = process.env.ETH_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID';

class EthereumService {
  static async getBalance(address) {
    try {
      const provider = new ethers.JsonRpcProvider(ETH_RPC_URL);
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (e) {
      console.error('EthereumService.getBalance error:', e.message);
      throw new Error('Failed to fetch ETH balance');
    }
  }

  static async sendETH(fromPrivateKey, toAddress, amountEth) {
    try {
      const provider = new ethers.JsonRpcProvider(ETH_RPC_URL);
      const wallet = new ethers.Wallet(fromPrivateKey, provider);
      const tx = await wallet.sendTransaction({
        to: toAddress,
        value: ethers.parseEther(amountEth.toString()),
      });
      await tx.wait();
      return tx.hash;
    } catch (e) {
      console.error('EthereumService.sendETH error:', e.message);
      throw new Error('Failed to send ETH');
    }
  }
}

module.exports = EthereumService;
