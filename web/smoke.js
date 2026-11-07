/**
 * Headless-смоук веб-превью: грузит бандл с дев-сервера и выполняет его в jsdom.
 * Печатает, отрендерился ли корень и какие ошибки вышли в консоль.
 * Запуск: node web/smoke.js   (дев-сервер должен быть поднят: npm run web)
 */

const fs = require('fs');
const { JSDOM } = require('jsdom');

const BUNDLE_URL = process.env.BUNDLE_URL || 'http://localhost:5173/bundle.js';

async function main() {
  const code = await (await fetch(BUNDLE_URL)).text();

  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  });

  const errors = [];
  dom.window.addEventListener('error', (e) => errors.push('window.onerror: ' + e.message));
  const origError = dom.window.console.error;
  dom.window.console.error = (...args) => {
    errors.push('console.error: ' + args.map(String).join(' ').slice(0, 300));
    origError(...args);
  };

  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.localStorage = dom.window.localStorage;
  global.location = dom.window.location;
  global.history = dom.window.history;
  global.WebSocket = class {
    constructor() {}
    send() {}
    close() {}
  };
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  dom.window.ResizeObserver = global.ResizeObserver;
  global.fetch = () => Promise.reject(new Error('smoke: сеть отключена'));
  dom.window.WebSocket = global.WebSocket;
  dom.window.fetch = global.fetch;

  try {
    dom.window.eval(code);
  } catch (e) {
    console.log('FATAL при выполнении бандла:', e && e.message);
    console.log((e && e.stack || '').split('\n').slice(0, 6).join('\n'));
    process.exit(1);
  }

  // даём реакту и демо-фолбэку шанс отработать
  await new Promise((r) => setTimeout(r, 2500));

  const root = dom.window.document.getElementById('root');
  const html = root ? root.innerHTML : '';
  console.log('длина HTML в #root:', html.length);
  console.log('есть демо-товар «Маргарита»:', html.includes('Маргарита'));
  console.log('есть плашка демо-данных:', html.includes('Демо-данные'));
  console.log('есть таб-бар «Каталог»:', html.includes('Каталог'));
  const interesting = errors.filter((e) => !/not wrapped in act|Download the React DevTools/.test(e));
  console.log('ошибок консоли (без шума):', interesting.length);
  interesting.slice(0, 8).forEach((e) => console.log('  -', e));
  process.exit(html.length > 200 ? 0 : 2);
}

main().catch((e) => {
  console.log('SMOKE FAIL:', e.message);
  process.exit(1);
});
