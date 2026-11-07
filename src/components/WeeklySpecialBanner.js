/**
 * Баннер «Пицца недели» (v1.1, вечер 02.11.2026).
 *
 * Сверстан по макетам design/weekly-special-light.png / -dark.png
 * (композиция тёмного): карточка radius 20, слева пилюля-бейдж с сердцем,
 * заголовок блюда, состав в две строки, строка цены (старая зачёркнута,
 * новая крупно акцентом), кнопка «В корзину»; справа фото пиццы, обрезанное
 * краем карточки, круглый бейдж скидки поверх фото.
 *
 * Данные: /products/weekly-special/ — ОДИН объект-карточка.
 * discount_percent и old_price приходят с сервера, когда друг добавит их
 * в сериалайзер (вопрос в списке к спеке); пока их нет — бейдж и старая
 * цена просто не рисуются, блок остаётся честным.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ProductImage from './ui/ProductImage';
import useAppTheme from '../theme/useAppTheme';
import { num } from '../utils/money';

const WeeklySpecialBanner = ({ product, onAdd, onPress }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  if (!product) return null;

  const composition = (product.description || '')
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');

  const percent = product.discount_percent ?? null;
  const oldPrice = product.old_price ?? null;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.info}>
        <View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>♥ Пицца недели</Text>
          </View>
          <Text style={styles.title}>{product.name}</Text>
          {composition ? (
            <Text style={styles.composition} numberOfLines={2}>
              {composition}
            </Text>
          ) : null}
        </View>
        <View>
          <View style={styles.priceRow}>
            {oldPrice !== null && (
              <Text style={styles.oldPrice}>{num(oldPrice).toFixed(2)} BYN</Text>
            )}
            <Text style={styles.price}>
              {num(product.price ?? product.min_price).toFixed(2)} BYN
            </Text>
          </View>
          {onAdd ? (
            <TouchableOpacity
              style={styles.button}
              onPress={onAdd}
              accessibilityLabel="Добавить пиццу недели в корзину"
            >
              <Text style={styles.buttonText}>В корзину</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <View style={styles.imageWrap}>
        <ProductImage uri={product.image} style={styles.image} />
        {percent !== null && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{percent}%</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const makeStyles = (colors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 20,
      backgroundColor: colors.cardBg,
      overflow: 'hidden',
      minHeight: 230,
      // мягкая тень, как у карточек каталога
      elevation: 3,
      shadowColor: '#000000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      borderWidth: 1,
      borderColor: colors.divider,
    },
    info: {
      flex: 1,
      padding: 16,
      justifyContent: 'space-between',
    },
    pill: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    pillText: {
      color: colors.buttonText,
      fontSize: 12,
      fontWeight: '700',
    },
    title: {
      marginTop: 12,
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
    },
    composition: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 19,
      color: colors.textMuted,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 12,
    },
    oldPrice: {
      marginRight: 8,
      fontSize: 13,
      color: colors.textMuted,
      textDecorationLine: 'line-through',
    },
    price: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.accent,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    buttonText: {
      color: colors.buttonText,
      fontSize: 15,
      fontWeight: '700',
    },
    imageWrap: {
      width: '45%',
      alignSelf: 'stretch',
      overflow: 'hidden',
    },
    image: {
      // absolute-инсеты: картинка не участвует в расчёте высоты строки,
      // иначе на мобильном веб огромный png растягивает карточку на экраны
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    },
    discountBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    discountText: {
      color: colors.buttonText,
      fontSize: 15,
      fontWeight: '800',
    },
  });

export default WeeklySpecialBanner;
