/**
 * AlertService - Multi-channel alerting service
 * Phase 25: Product Completion
 */

class AlertService {
  constructor(config = {}) {
    this.channels = {
      telegram: config.telegram || null,
      email: config.email || null,
      slack: config.slack || null
    };
    this.alertHistory = [];
    this.maxHistory = config.maxHistory || 1000;
  }

  async send(type, message, severity = 'INFO') {
    const alert = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      type,
      message,
      severity,
      timestamp: new Date().toISOString()
    };

    this.alertHistory.push(alert);

    // Trim history
    if (this.alertHistory.length > this.maxHistory) {
      this.alertHistory.shift();
    }

    console.log(`[${severity}] ${type}: ${message}`);

    // Send to channels based on severity
    if (severity === 'CRITICAL') {
      await this.sendAllChannels(alert);
    } else if (severity === 'HIGH') {
      await Promise.all([
        this.sendTelegram(alert),
        this.sendEmail(alert)
      ]);
    }
    // INFO and LOW are logged only

    return alert;
  }

  async sendTelegram(alert) {
    if (!this.channels.telegram?.botToken || !this.channels.telegram?.chatId) {
      return { sent: false, reason: 'Telegram not configured' };
    }

    const { botToken, chatId } = this.channels.telegram;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `[${alert.severity}] ${alert.type}\n${alert.message}\n⏰ ${alert.timestamp}`
        })
      });

      if (!response.ok) throw new Error(`Telegram API error: ${response.status}`);
      return { sent: true, channel: 'telegram' };
    } catch (error) {
      console.error('[AlertService] Telegram send failed:', error.message);
      return { sent: false, error: error.message };
    }
  }

  async sendEmail(alert) {
    if (!this.channels.email?.host) {
      return { sent: false, reason: 'Email not configured' };
    }

    // Email sending would require nodemailer or similar
    // For now, just log
    console.log(`[AlertService] Would send email: [${alert.severity}] ${alert.type}`);
    return { sent: false, reason: 'Email service not implemented' };
  }

  async sendSlack(alert) {
    if (!this.channels.slack?.webhookUrl) {
      return { sent: false, reason: 'Slack not configured' };
    }

    try {
      const response = await fetch(this.channels.slack.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `*[${alert.severity}]* ${alert.type}\n${alert.message}`,
          unfurl_link: false
        })
      });

      if (!response.ok) throw new Error(`Slack webhook error: ${response.status}`);
      return { sent: true, channel: 'slack' };
    } catch (error) {
      console.error('[AlertService] Slack send failed:', error.message);
      return { sent: false, error: error.message };
    }
  }

  async sendAllChannels(alert) {
    const results = await Promise.allSettled([
      this.sendTelegram(alert),
      this.sendEmail(alert),
      this.sendSlack(alert)
    ]);
    return results.map((r, i) => ({ channel: ['telegram', 'email', 'slack'][i], ...r }));
  }

  getAlertHistory(hours = 24) {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.alertHistory.filter(a => new Date(a.timestamp).getTime() > cutoff);
  }

  clearHistory() {
    this.alertHistory = [];
  }

  getStats() {
    const now = Date.now();
    const hour = 3600000;

    return {
      total: this.alertHistory.length,
      last24h: this.getAlertHistory(24).length,
      last1h: this.alertHistory.filter(a => now - new Date(a.timestamp).getTime() < hour).length,
      bySeverity: {
        CRITICAL: this.alertHistory.filter(a => a.severity === 'CRITICAL').length,
        HIGH: this.alertHistory.filter(a => a.severity === 'HIGH').length,
        MEDIUM: this.alertHistory.filter(a => a.severity === 'MEDIUM').length,
        INFO: this.alertHistory.filter(a => a.severity === 'INFO').length
      }
    };
  }
}

module.exports = { AlertService };