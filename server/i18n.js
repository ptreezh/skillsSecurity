/**
 * Minimal i18n helper for backend API messages.
 * Supports zh-CN (default) and en-US.
 */
const fs = require('fs');
const path = require('path');

const locales = {};
const localesDir = path.join(__dirname, 'locales');

function loadLocales() {
  if (!fs.existsSync(localesDir)) return;
  for (const file of fs.readdirSync(localesDir)) {
    if (file.endsWith('.json')) {
      const name = path.basename(file, '.json');
      try {
        locales[name] = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf-8'));
      } catch (e) {
        console.error(`[i18n] Failed to load locale ${file}:`, e.message);
      }
    }
  }
}

loadLocales();

function resolveValue(dict, keyPath) {
  const parts = keyPath.split('.');
  let value = dict;
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return undefined;
    }
  }
  return value;
}

function t(locale, key, data = {}) {
  const dict = locales[locale] || locales['zh-CN'] || {};
  let value = resolveValue(dict, key);
  if (typeof value !== 'string') {
    value = resolveValue(locales['en-US'] || {}, key);
  }
  if (typeof value !== 'string') return key;
  return value.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    data[k] !== undefined ? data[k] : `{{${k}}}`
  );
}

function getLocale(req) {
  const query = req.query?.lang;
  if (query) {
    if (query.toLowerCase().startsWith('en')) return 'en-US';
    if (query.toLowerCase().startsWith('zh')) return 'zh-CN';
  }
  const header = req.headers['accept-language'] || '';
  if (header.toLowerCase().includes('en')) return 'en-US';
  return 'zh-CN';
}

module.exports = { t, getLocale, locales };
