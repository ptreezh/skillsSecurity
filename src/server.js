/**
 * Monitoring Server - Operations monitoring and alerting backend
 * Phase 25: Product Completion
 */

const express = require('express');
const { GasMonitor } = require('./services/gasMonitor');
const { EventWatcher } = require('./services/eventWatcher');
const { AlertService } = require('./services/alertService');

// Load environment variables
require('dotenv').config();

const app = express();
app.use(express.json());

// Initialize services
const alertService = new AlertService({
  telegram: process.env.TELEGRAM_BOT_TOKEN ? {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID
  } : null
});

const gasMonitor = new GasMonitor({
  fastThreshold: parseInt(process.env.GAS_FAST_THRESHOLD) || 100,
  standardThreshold: parseInt(process.env.GAS_STANDARD_THRESHOLD) || 50,
  slowThreshold: parseInt(process.env.GAS_SLOW_THRESHOLD) || 20,
  onAlert: (type, message, severity) => alertService.send(type, message, severity)
});

let eventWatcher = null;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Gas price endpoint
app.get('/api/gas', async (req, res) => {
  try {
    const current = gasMonitor.getCurrentPrices();
    const average = gasMonitor.getAverageGas(10);
    res.json({ current, average });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Force gas check
app.post('/api/gas/check', async (req, res) => {
  try {
    const price = await gasMonitor.checkGasPrice();
    res.json({ success: true, price });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alerts endpoint
app.get('/api/alerts', (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  const alerts = alertService.getAlertHistory(hours);
  const stats = alertService.getStats();
  res.json({ alerts, stats });
});

// Alert statistics
app.get('/api/alerts/stats', (req, res) => {
  res.json(alertService.getStats());
});

// Send test alert
app.post('/api/alerts/test', async (req, res) => {
  const { type = 'TEST', message = 'Test alert', severity = 'INFO' } = req.body;
  const alert = await alertService.send(type, message, severity);
  res.json({ success: true, alert });
});

// Metrics endpoint for monitoring dashboards
app.get('/metrics', async (req, res) => {
  const avgGas = gasMonitor.getAverageGas();
  const alertStats = alertService.getStats();

  res.set('Content-Type', 'text/plain');
  res.send(`
# HELP agentSkills_gas_price_fast Current fast gas price in Gwei
# TYPE agentSkills_gas_price_fast gauge
agentSkills_gas_price_fast ${avgGas?.fast || 0}

# HELP agentSkills_gas_price_standard Current standard gas price in Gwei
# TYPE agentSkills_gas_price_standard gauge
agentSkills_gas_price_standard ${avgGas?.standard || 0}

# HELP agentSkills_alerts_total Total alerts in history
# TYPE agentSkills_alerts_total counter
agentSkills_alerts_total ${alertStats.total}

# HELP agentSkills_alerts_24h Alerts in last 24 hours
# TYPE agentSkills_alerts_24h gauge
agentSkills_alerts_24h ${alertStats.last24h}
`.trim());
});

// Event watcher status
app.get('/api/events/status', (req, res) => {
  if (!eventWatcher) {
    return res.json({ active: false, message: 'Event watcher not initialized' });
  }
  res.json({
    active: true,
    listeners: eventWatcher.activeListeners?.length || 0
  });
});

// Initialize and start server
const PORT = process.env.PORT || 3001;

async function start() {
  // Try to initialize event watcher if contracts are configured
  if (process.env.STAKING_MANAGER_ADDRESS && process.env.RPC_URL) {
    try {
      const { ethers } = require('ethers');
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

      // Import ABIs
      const StakingManager = require('./abi/StakingManager.json');
      const SkillRegistry = require('./abi/SkillRegistry.json');
      const Attribution = require('./abi/Attribution.json');

      const contracts = {
        stakingManager: new ethers.Contract(
          process.env.STAKING_MANAGER_ADDRESS,
          StakingManager.abi,
          provider
        ),
        skillRegistry: process.env.SKILL_REGISTRY_ADDRESS ? new ethers.Contract(
          process.env.SKILL_REGISTRY_ADDRESS,
          SkillRegistry.abi,
          provider
        ) : null,
        attribution: process.env.ATTRIBUTION_ADDRESS ? new ethers.Contract(
          process.env.ATTRIBUTION_ADDRESS,
          Attribution.abi,
          provider
        ) : null
      };

      eventWatcher = new EventWatcher(contracts, provider);
      eventWatcher.setAlertCallback((type, message, severity) => alertService.send(type, message, severity));
      await eventWatcher.start();
      console.log('[Server] Event watcher started');
    } catch (error) {
      console.warn('[Server] Event watcher init failed:', error.message);
    }
  }

  // Start gas monitoring
  gasMonitor.checkGasPrice().catch(console.error);
  const gasInterval = setInterval(() => gasMonitor.checkGasPrice().catch(console.error), 60000);

  // Start server
  const server = app.listen(PORT, () => {
    console.log(`[Server] Monitoring server on port ${PORT}`);
    console.log(`[Server] Gas monitoring: ${gasInterval ? 'active' : 'inactive'}`);
    console.log(`[Server] Event watching: ${eventWatcher ? 'active' : 'inactive'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[Server] Shutting down...');
    clearInterval(gasInterval);
    if (eventWatcher) await eventWatcher.stop();
    server.close();
    process.exit(0);
  });
}

start().catch(console.error);

module.exports = { app, gasMonitor, alertService, eventWatcher };