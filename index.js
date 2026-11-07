/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { USE_DEMO_FALLBACK } from './src/config/api';

// В демо-режиме (API ещё не задеплоен) ожидаемые сбои запросов не зажигают
// LogBox красными тостами: плашки «демо-данные» на экранах достаточно.
// Настоящие ошибки (TypeError и т.п.) продолжают показываться как раньше.
if (__DEV__ && USE_DEMO_FALLBACK) {
  const origConsoleError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === 'string' && /failed/i.test(args[0])) return;
    origConsoleError(...args);
  };
}

// Жёлтая плашка «Open debugger to view warnings» — dev-шум на экране.
// Предупреждения не теряются: уходят строками в терминал Metro, где их удобно
// читать разработчику, а не пользователю на телефоне.
if (__DEV__) {
  const origConsoleLog = console.log.bind(console);
  console.warn = (...args) => {
    origConsoleLog('[warn]', ...args);
  };
}

AppRegistry.registerComponent(appName, () => App);
