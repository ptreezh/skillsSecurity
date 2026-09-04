const { getLocale, t } = require('./i18n');

function localeMiddleware(req, res, next) {
  req.locale = getLocale(req);
  req.t = (key, data) => t(req.locale, key, data);
  next();
}

module.exports = { localeMiddleware };
