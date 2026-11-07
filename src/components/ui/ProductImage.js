/**
 * ProductImage — картинка товара с честной заглушкой.
 *
 * Зачем: экраны исторически подставляли fallback с via.placeholder.com —
 * сервис мёртв (404/403), и карточки рисовались серыми квадратами.
 * Реальный API может прислать image: null (ImageField(blank=True, null=True)),
 * поэтому заглушка нужна и в бою: рисуем плитку цвета hover-bg с эмодзи
 * категории вместо битой внешней картинки.
 */

import React from 'react';
import { Platform, View, Text, Image } from 'react-native';
import useAppTheme from '../../theme/useAppTheme';

export const CATEGORY_GLYPHS = {
  picca: '🍕',
  kalcone: '🥟',
  burgery: '🍔',
  kombo: '🍱',
  sety: '🎁',
  sousy: '🥫',
  napitki: '🥤',
  fastfud: '🍟',
  skovorodki: '🍳',
};

// Чистая функция: веб-атрибуты ленивой загрузки по платформе.
// Вынесена из компонента, чтобы регрессия тяжёлого каталога проверялась
// без рендера и моков react-native (02.11.2026).
export const webLazyProps = (os) =>
  os === 'web' ? { loading: 'lazy', decoding: 'async' } : {};

export default function ProductImage({ uri, glyph, style, emojiSize = 40 }) {
  const { colors } = useAppTheme();

  if (uri) {
    // 02.11.2026: каталог тянул 22 MB картинок разом (92 запроса, 34 c до
    // полной отрисовки на веб-превью). На веб отдаём браузеру loading="lazy"
    // и decoding="async": картинки вне экрана не грузятся и не декабятся,
    // лента начинает отвечать сразу. На native атрибуты игнорируются,
    // там ленивость даёт виртуализация FlatList (см. CatalogScreen).
    return (
      <Image
        source={{ uri }}
        style={style}
        resizeMode="cover"
        {...webLazyProps(Platform.OS)}
      />
    );
  }

  return (
    <View
      style={[
        style,
        {
          backgroundColor: colors.hoverBg,
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <Text style={{ fontSize: emojiSize }}>{glyph || '🍕'}</Text>
    </View>
  );
}
