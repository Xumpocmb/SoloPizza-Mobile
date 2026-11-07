/**
 * Shim поверх react-native-web: доэкспортирует то, чего в веб-версии нет,
 * но что использует приложение (RefreshControl и др.). На телефоне этот
 * файл не используется никогда — его видит только vite (web-сборка).
 */

export * from 'react-native-web';

import React from 'react';

export function RefreshControl({ children, onRefresh, refreshing, ...rest }) {
  // в веб «тянуть вниз» не нужно: дети рендерим как есть
  void onRefresh;
  void refreshing;
  void rest;
  return children ?? null;
}

export const SafeAreaView = ({ children, ...rest }) => {
  void rest;
  return children ?? null;
};

export default {};
