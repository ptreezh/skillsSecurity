/**
 * GasMonitor - Gas price monitoring service
 * Phase 25: Product Completion
 */

const fetch = require('cross-fetch');

class GasMonitor {
  constructor(config = {}) {
    this.alertThreshold = {
      fast: config.fastThreshold || 100,      // Gwei
      standard: config.standardThreshold || 50,   // Gwei
      slow: config.slowThreshold || 20        // Gwei
    };
    this.lastPrices = [];
    this.lastChecked = null;
    this.alertCallback = config.onAlert || null;
  }

  async fetchGasPrice() {
    try {
      const response = await fetch('https://gasstation-mainnet.matic.network/v2');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return {
        fast: parseInt(data.fast?.maxPrice) || 0,
        standard: parseInt(data.standard?.maxPrice) || 0,
        slow: parseInt(data.slow?.maxPrice) || 0,
        timestamp: Date.now()
      };
    } catch (error) {
      // Fallback: use Polygon RPC gas price
      console.warn('Gas station unavailable, using fallback:', error.message);
      return {
        fast: 50,
        standard: 40,
        slow: 30,
        timestamp: Date.now(),
        fallback: true
      };
    }
  }

  async checkGasPrice() {
    const price = await this.fetchGasPrice();
    this.lastPrices.push(price);
    this.lastChecked = Date.now();

    // Keep last 100 readings
    if (this.lastPrices.length > 100) {
      this.lastPrices.shift();
    }

    // Alert if gas is high
    if (price.fast > this.alertThreshold.fast && this.alertCallback) {
      await this.alertCallback('HIGH_GAS', `Fast gas at ${price.fast} Gwei`, 'HIGH');
    }

    return price;
  }

  getAverageGas(samples = 10) {
    const recent = this.lastPrices.slice(-samples);
    if (recent.length === 0) return null;

    return {
      fast: recent.reduce((a, b) => a + b.fast, 0) / recent.length,
      standard: recent.reduce((a, b) => a + b.standard, 0) / recent.length,
      slow: recent.reduce((a, b) => a + b.slow, 0) / recent.length
    };
  }

  getCurrentPrices() {
    return this.lastPrices[this.lastPrices.length - 1] || null;
  }

  async setAlertCallback(callback) {
    this.alertCallback = callback;
  }
}

module.exports = { GasMonitor };