/**
 * Единая точка подключения иконок.
 *
 * СОЗДАНО ПРИ АУДИТЕ 31.10.2026.
 *
 * Зачем: три экрана импортировали 'react-native-vector-icons/MaterialIcons'
 * напрямую. В v10.x пакет переведён на новую модель — сами глифы живут
 * в отдельном пакете @react-native-vector-icons/material-icons, а в
 * react-native-vector-icons/fonts каталога больше нет. Без подключённого
 * шрифта иконки рендерятся как пустые квадраты («tofu»).
 *
 * Этот компонент:
 *   1. сохраняет тот же API (<Icon name size color />), так что экраны
 *      правятся заменой одной строки импорта;
 *   2. пробует загрузить шрифт и, если его нет, переключается на
 *      текстовый фолбэк — приложение не выглядит сломанным.
 *
 * ЧТО СДЕЛАТЬ ДАЛЬШЕ (Фаза 4, миграция на Expo):
 *   npx expo install @expo/vector-icons
 *   и заменить реализацию ниже на re-export из @expo/vector-icons —
 *   там шрифты уже встроены, ничего линковать не нужно.
 */

import React from 'react';
import { Text } from 'react-native';

let MaterialIcons = null;
try {
  // eslint-disable-next-line global-require
  MaterialIcons = require('react-native-vector-icons/MaterialIcons').default;
} catch (e) {
  MaterialIcons = null;
}

let fontReady = false;
try {
  if (MaterialIcons && typeof MaterialIcons.loadFont === 'function') {
    MaterialIcons.loadFont().then(() => {
      fontReady = true;
    }).catch(() => {
      fontReady = false;
    });
  }
} catch (e) {
  fontReady = false;
}

/**
 * Фолбэк: Material Icons name → эмодзи/символ.
 * Покрывает только те имена, которые реально используются в проекте.
 */
const FALLBACK_GLYPHS = {
  'arrow-back': '←',
  'arrow-forward': '→',
  'add': '+',
  'remove': '−',
  'delete': '🗑',
  'close': '✕',
  'refresh': '↻',
  'receipt': '🧾',
  'receipt-long': '🧾',
  'shopping-cart': '🛒',
  'person': '👤',
  'home': '🏠',
  'search': '🔍',
  'visibility': '👁',
  'visibility-off': '🚫',
  'email': '✉',
  'lock': '🔒',
  'phone': '📞',
  'location-on': '📍',
  'star': '★',
  'check': '✓',
  'chevron-right': '›',
  'keyboard-arrow-right': '›',
};

export default function Icon({ name, size = 24, color = '#333333', style, ...rest }) {
  if (MaterialIcons) {
    return <MaterialIcons name={name} size={size} color={color} style={style} {...rest} />;
  }

  return (
    <Text
      style={[
        { fontSize: size * 0.8, color, lineHeight: size, textAlign: 'center' },
        style,
      ]}
      {...rest}
    >
      {FALLBACK_GLYPHS[name] || '•'}
    </Text>
  );
}

export { fontReady };
