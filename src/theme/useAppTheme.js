/**
 * useAppTheme — светлая/тёмная палитра сайта в нативном виде.
 *
 * Переключатель темы берётся из системного useColorScheme (как .dark на сайте
 * переключается классом). Экраны используют так:
 *
 *   const { colors, isDark } = useAppTheme();
 *   <View style={{ backgroundColor: colors.bg, borderRadius: colors.borderRadius }}>
 *
 * Палитра: src/theme/colors.js (CSS-переменные сайта, сообщение от 01.11.2026).
 */

import { useColorScheme } from 'react-native';
import { light, dark } from './colors';

export default function useAppTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { colors: isDark ? dark : light, isDark };
}
