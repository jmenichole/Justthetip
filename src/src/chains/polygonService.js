// Polygon (MATIC) service using ethers.js
const { ethers } = require('ethers');
require('dotenv').config();

const MATIC_RPC_URL = process.env.MATIC_RPC_URL || 'https://polygon-rpc.com';

class PolygonService {
  static async getBalance(address) {
    try {
      const provider = new ethers.JsonRpcProvider(MATIC_RPC_URL);
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (e) {
      console.error('PolygonService.getBalance error:', e.message);
      throw new Error('Failed to fetch MATIC balance');
    }
  }

  static async sendMATIC(fromPrivateKey, toAddress, amountMatic) {
    try {
      const provider = new ethers.JsonRpcProvider(MATIC_RPC_URL);
      const wallet = new ethers.Wallet(fromPrivateKey, provider);
      const tx = await wallet.sendTransaction({
        to: toAddress,
        value: ethers.parseEther(amountMatic.toString()),
      });
      await tx.wait();
      return tx.hash;
    } catch (e) {
      console.error('PolygonService.sendMATIC error:', e.message);
      throw new Error('Failed to send MATIC');
    }
  }
}

module.exports = PolygonService;
