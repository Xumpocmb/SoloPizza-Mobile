/**
 * «Мои заказы» из /api/v1/orders/: последние 50 заказов пользователя —
 * и с сайта, и из приложения. Только после входа.
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAppTheme from '../theme/useAppTheme';
import { orderService } from '../services';
import { DELIVERY_LABELS } from '../services/orderService';
import { num } from '../utils/money';
import { apiErrorMessage } from '../utils/apiError';

export const formatOrderDate = (iso) =>
  new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export default function OrderHistoryScreen({ navigation }) {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    () =>
      orderService
        .getOrders()
        .then((data) => {
          setOrders(data);
          setError(null);
        })
        .catch((err) => setError(err?.status === 401 ? 'login' : apiErrorMessage(err))),
    [],
  );

  // при каждом возврате на экран — свежие статусы
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  };

  if (error === 'login') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Войдите, чтобы увидеть заказы</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.buttonText}>Войти</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!orders) {
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
    <FlatList
      style={styles.container}
      contentContainerStyle={orders.length ? styles.list : styles.center}
      data={orders}
      keyExtractor={(order) => String(order.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <>
          <Text style={styles.title}>Заказов пока нет</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('MainTabs', { screen: 'Catalog' })}>
            <Text style={styles.buttonText}>Перейти в меню</Text>
          </TouchableOpacity>
        </>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
          accessibilityRole="button"
        >
          <View style={styles.row}>
            <Text style={styles.number}>Заказ №{item.number}</Text>
            <Text style={[styles.status, item.status === 'canceled' && styles.statusCanceled]}>{item.status_display}</Text>
          </View>
          <Text style={styles.muted}>
            {formatOrderDate(item.created_at)} · {DELIVERY_LABELS[item.delivery_type] ?? item.delivery_type}
          </Text>
          <View style={styles.row}>
            <Text style={styles.muted} numberOfLines={1}>
              {item.items.map((line) => line.name).join(', ')}
            </Text>
            <Text style={styles.total}>{num(item.total_price).toFixed(2)} BYN</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    list: { padding: 16, gap: 12 },
    center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: colors.bg },
    title: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
    muted: { flexShrink: 1, fontSize: 14, color: colors.textMuted },
    card: { padding: 16, gap: 6, borderRadius: 16, backgroundColor: colors.cardBg },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    number: { fontSize: 16, fontWeight: '700', color: colors.text },
    status: { fontSize: 14, fontWeight: '600', color: colors.accent },
    statusCanceled: { color: colors.textMuted },
    total: { fontSize: 16, fontWeight: '700', color: colors.text },
    button: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: colors.accent },
    buttonText: { fontSize: 16, fontWeight: '600', color: colors.buttonText },
  });
