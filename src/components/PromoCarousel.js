/**
 * Лента акций на главной — те же предложения, что на странице сайта /discounts/.
 * Тексты акций на сайте зашиты в шаблон (API для них нет), поэтому и здесь — константы.
 * Первая карточка — «Пицца недели»: с фото, названием и ценой, если пицца назначена
 * (/products/weekly-special/), иначе только условия акции.
 */
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Icon from './ui/Icon';
import ProductImage from './ui/ProductImage';
import useAppTheme from '../theme/useAppTheme';
import { num } from '../utils/money';

const GAP = 12;
const SIDE = 20; // как у секций главной

// как на solo-pizza.by/discounts/
const OFFERS = [
  {
    id: 'weekly',
    icon: 'local-pizza',
    title: 'Пицца недели',
    badge: '−20%',
    text: 'По будням и только на самовывоз — на определённую пиццу 32 см.',
  },
  {
    id: 'combo',
    icon: 'fastfood',
    title: 'Выгодные КОМБО',
    badge: 'ХИТ',
    text: 'По будням с 11:00 до 17:00.',
    toCatalog: true,
  },
  {
    id: 'birthday',
    icon: 'cake',
    title: 'Скидка на День Рождения',
    badge: '−10%',
    text: 'За 3 дня до и 3 дня после даты рождения, только на пиццу.',
    note: 'Только в зале при предъявлении документа',
  },
  {
    id: 'pickup',
    icon: 'directions-car',
    title: 'Скидка на самовывоз',
    badge: '−10%',
    text: 'Постоянная скидка на пиццу при заказе с самовывозом.',
  },
];

export default function PromoCarousel({ weekly, onOpenProduct, onOpenCatalog }) {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - SIDE * 2 - 24, 380); // край следующей карточки виден — понятно, что листается
  const [index, setIndex] = useState(0);

  const onPressFor = (offer) => {
    if (offer.id === 'weekly' && weekly) return () => onOpenProduct(weekly);
    if (offer.toCatalog) return onOpenCatalog;
    return undefined;
  };

  const renderOffer = ({ item: offer }) => {
    const onPress = onPressFor(offer);
    const showWeekly = offer.id === 'weekly' && weekly;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.card, { width: cardWidth }]}
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
      >
        <View style={styles.body}>
          <View style={styles.headRow}>
            <View style={styles.iconCircle}>
              <Icon name={offer.icon} size={20} color={colors.accent} />
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{offer.badge}</Text>
            </View>
          </View>
          <Text style={styles.title} numberOfLines={1}>{offer.title}</Text>
          {showWeekly ? (
            <>
              <Text style={styles.productName} numberOfLines={1}>{weekly.name}</Text>
              <Text style={styles.text} numberOfLines={1}>будни · самовывоз · 32 см</Text>
              <Text style={styles.price}>от {num(weekly.price ?? weekly.min_price).toFixed(2)} BYN</Text>
            </>
          ) : (
            <>
              <Text style={styles.text} numberOfLines={3}>{offer.text}</Text>
              {offer.note ? <Text style={styles.note} numberOfLines={2}>{offer.note}</Text> : null}
            </>
          )}
          {onPress ? (
            <Text style={styles.link}>{showWeekly ? 'Выбрать пиццу' : 'Смотреть в меню'} ›</Text>
          ) : null}
        </View>
        {showWeekly ? <ProductImage uri={weekly.image} style={styles.image} emojiSize={44} /> : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Акции</Text>
      <FlatList
        data={OFFERS}
        keyExtractor={(offer) => offer.id}
        renderItem={renderOffer}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + GAP}
        decelerationRate="fast"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        scrollEventThrottle={32}
        onScroll={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / (cardWidth + GAP)))
        }
      />
      <View style={styles.dots}>
        {OFFERS.map((offer, i) => (
          <View key={offer.id} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      marginBottom: 25,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
      marginHorizontal: SIDE,
      marginBottom: 15,
    },
    list: {
      paddingHorizontal: SIDE,
    },
    card: {
      height: 190,
      flexDirection: 'row',
      borderRadius: 20,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.divider,
      overflow: 'hidden',
    },
    body: {
      flex: 1,
      padding: 16,
    },
    headRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accentRgba,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    badgeText: {
      color: colors.buttonText,
      fontSize: 14,
      fontWeight: '800',
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    productName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.accent,
      marginBottom: 2,
    },
    text: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
    },
    note: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '600',
      color: colors.error,
    },
    price: {
      marginTop: 4,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    link: {
      marginTop: 'auto',
      fontSize: 14,
      fontWeight: '700',
      color: colors.accent,
    },
    image: {
      width: 110,
      height: '100%',
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      marginTop: 10,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.divider,
    },
    dotActive: {
      width: 18,
      backgroundColor: colors.accent,
    },
  });
