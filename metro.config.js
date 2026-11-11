const { getDefaultConfig } = require('expo/metro-config');
const { createProxyMiddleware } = require('http-proxy-middleware');

const config = getDefaultConfig(__dirname);

// Веб-превью (npm run web) ходит на живой API через dev-сервер: solo-pizza.by
// не отдаёт CORS-заголовки, поэтому в вебе API_BASE_URL относительный.
// На телефоне прокси не участвует — там абсолютный адрес из src/config/api.js.
const proxy = createProxyMiddleware({
  target: 'https://solo-pizza.by',
  changeOrigin: true,
  pathFilter: ['/api', '/media'],
});

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) =>
    proxy(req, res, () => middleware(req, res, next)),
};

module.exports = config;
