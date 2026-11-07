/**
 * Регрессия тяжёлого каталога (02.11.2026): на веб картинки товаров обязаны
 * уходить в ленивую загрузку (22 MB / 92 запроса разом, 34 c до отрисовки),
 * на native веб-атрибутов быть не должно — там ленивость даёт FlatList.
 * Проверяем чистую webLazyProps: без рендера и моков react-native.
 */

import { webLazyProps } from '../src/components/ui/ProductImage';

test('web: loading=lazy + decoding=async', () => {
  expect(webLazyProps('web')).toEqual({ loading: 'lazy', decoding: 'async' });
});

test('native: атрибутов нет', () => {
  expect(webLazyProps('ios')).toEqual({});
  expect(webLazyProps('android')).toEqual({});
});
