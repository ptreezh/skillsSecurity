// CommonJS preload script to set up proxy via https-proxy-agent
// Monkey-patches http/https modules to route through the proxy
const http = require("http");
const https = require("https");
const { HttpsProxyAgent } = require("https-proxy-agent");

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  const proxyAgent = new HttpsProxyAgent(proxyUrl);
  
  // Patch http.request
  const origHttpRequest = http.request;
  http.request = function(options, callback) {
    if (typeof options === "string") {
      options = new URL(options);
    }
    if (!options.agent && options.protocol !== "http:" && options.hostname !== "localhost" && options.hostname !== "127.0.0.1") {
      options.agent = proxyAgent;
    }
    return origHttpRequest.call(this, options, callback);
  };
  
  // Patch https.request
  const origHttpsRequest = https.request;
  https.request = function(options, callback) {
    if (typeof options === "string") {
      options = new URL(options);
    }
    if (!options.agent && options.hostname !== "localhost" && options.hostname !== "127.0.0.1") {
      options.agent = proxyAgent;
    }
    return origHttpsRequest.call(this, options, callback);
  };
  
  // Also patch get methods
  const origHttpGet = http.get;
  http.get = function(options, callback) {
    if (typeof options === "string") {
      options = new URL(options);
    }
    if (!options.agent && options.protocol !== "http:" && options.hostname !== "localhost" && options.hostname !== "127.0.0.1") {
      options.agent = proxyAgent;
    }
    return origHttpGet.call(this, options, callback);
  };
  
  const origHttpsGet = https.get;
  https.get = function(options, callback) {
    if (typeof options === "string") {
      options = new URL(options);
    }
    if (!options.agent && options.hostname !== "localhost" && options.hostname !== "127.0.0.1") {
      options.agent = proxyAgent;
    }
    return origHttpsGet.call(this, options, callback);
  };
  
  console.log("[proxy] HTTPS proxy enabled:", proxyUrl);
}
