/**
 * Детали заказа из /api/v1/orders/<id>/ (только свой заказ). Статус обновляется
 * раз в 30 секунд, пока экран открыт, — push-уведомлений нет (решение владельца).
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAppTheme from '../theme/useAppTheme';
import { orderService } from '../services';
import { DELIVERY_LABELS, FINAL_STATUSES, PAYMENT_LABELS } from '../services/orderService';
import { formatOrderDate } from './OrderHistoryScreen';
import { num } from '../utils/money';
import { apiErrorMessage } from '../utils/apiError';

const POLL_MS = 30000;
const money = (value) => `${num(value).toFixed(2)} BYN`;

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId, justCreated } = route.params;
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    () =>
      orderService
        .getOrder(orderId)
        .then((data) => {
          setOrder(data);
          setError(null);
          return data;
        })
        .catch((err) => {
          setError(apiErrorMessage(err, 'Не удалось загрузить заказ'));
          return null;
        }),
    [orderId],
  );

  useFocusEffect(
    useCallback(() => {
      let timer = null;
      const tick = () =>
        load().then((data) => {
          if (data && !FINAL_STATUSES.includes(data.status)) timer = setTimeout(tick, POLL_MS);
        });
      tick();
      return () => clearTimeout(timer);
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  };

  if (!order) {
    return (
      <View style={styles.center}>
        {error ? (
          <>
            <Text style={styles.muted}>{error}</Text>
            <TouchableOpacity style={styles.button} onPress={load}>
              <Text style={styles.buttonText}>Повторить</Text>
            </TouchableOpacity>
          </>
        ) : (
          <ActivityIndicator size="large" color={colors.accent} />
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {justCreated && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Заказ принят!</Text>
          <Text style={styles.bannerText}>Филиал подтвердит его в ближайшее время. Статус обновляется сам.</Text>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.number}>Заказ №{order.number}</Text>
          <Text style={[styles.status, order.status === 'canceled' && styles.statusCanceled]}>{order.status_display}</Text>
        </View>
        <Text style={styles.muted}>{formatOrderDate(order.created_at)}</Text>
        <Text style={styles.text}>
          {DELIVERY_LABELS[order.delivery_type] ?? order.delivery_type} · {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
        </Text>
        {!!order.address && <Text style={styles.text}>{order.address}</Text>}
        <Text style={styles.muted}>
          {order.customer_name}
          {order.phone ? ` · ${order.phone}` : ''}
        </Text>
        {!!order.comment && <Text style={styles.muted}>«{order.comment}»</Text>}
      </View>

      <View style={styles.card}>
        {order.items.map((line, index) => (
          <View key={index} style={styles.line}>
            <View style={styles.lineInfo}>
              <Text style={styles.text}>{`${line.name} × ${line.quantity}`}</Text>
              {!!line.options && <Text style={styles.muted}>{line.options}</Text>}
            </View>
            <Text style={styles.text}>{money(line.total)}</Text>
          </View>
        ))}
        {num(order.discount_amount) > 0 && (
          <View style={styles.row}>
            <Text style={styles.text}>Скидка</Text>
            <Text style={[styles.text, styles.discount]}>−{money(order.discount_amount)}</Text>
          </View>
        )}
        {order.delivery_type === 'delivery' && (
          <View style={styles.row}>
            <Text style={styles.text}>Доставка</Text>
            <Text style={styles.text}>{num(order.delivery_cost) > 0 ? money(order.delivery_cost) : 'бесплатно'}</Text>
          </View>
        )}
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Итого</Text>
          <Text style={styles.totalValue}>{money(order.total_price)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Contacts')}>
        <Text style={styles.buttonText}>Связаться с филиалом</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 12 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: colors.bg },
    banner: { padding: 16, gap: 4, borderRadius: 16, backgroundColor: colors.accentRgba },
    bannerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    bannerText: { fontSize: 14, color: colors.text },
    card: { padding: 16, gap: 8, borderRadius: 16, backgroundColor: colors.cardBg },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    number: { fontSize: 18, fontWeight: '700', color: colors.text },
    status: { fontSize: 15, fontWeight: '700', color: colors.accent },
    statusCanceled: { color: colors.textMuted },
    text: { fontSize: 15, color: colors.text },
    muted: { fontSize: 14, color: colors.textMuted },
    line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    lineInfo: { flex: 1, gap: 2 },
    discount: { color: colors.success },
    totalRow: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.divider },
    totalLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
    totalValue: { fontSize: 18, fontWeight: '700', color: colors.accent },
    button: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', backgroundColor: colors.accent },
    buttonText: { fontSize: 16, fontWeight: '600', color: colors.buttonText },
  });
