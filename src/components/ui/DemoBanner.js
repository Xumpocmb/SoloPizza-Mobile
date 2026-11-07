/**
 * DemoBanner — честная плашка «данные демонстрационные».
 *
 * Показывается только когда state.products.isDemo === true, то есть когда
 * боевой API ответил ошибкой и каталог подставил демо-данные (config/api.js,
 * USE_DEMO_FALLBACK). После деплоя app_api другом плашка исчезает сама.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import useAppTheme from '../../theme/useAppTheme';
import { DEMO_NOTICE } from '../../services/demoCatalog';

export default function DemoBanner() {
  const isDemo = useSelector((state) => state.products?.isDemo === true);
  const { colors } = useAppTheme();

  if (!isDemo) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.accentRgba }]}>
      <Text style={[styles.text, { color: colors.text }]}>{DEMO_NOTICE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  text: {
    fontSize: 12,
    textAlign: 'center',
  },
});
