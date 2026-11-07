import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Linking,
} from 'react-native';
import Alert from '../utils/alertShim';
import useAppTheme from '../theme/useAppTheme';
import { num } from '../utils/money';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrderDetail, cancelOrder } from '../store/slices/orderSlice';
import { orderService } from '../services';

const OrderDetailScreen = ({ route, navigation }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const { orderId, order: routeOrder } = route.params;
  const dispatch = useDispatch();
  const { currentOrder, isLoading, error } = useSelector((state) => state.order);
  const [refreshing, setRefreshing] = useState(false);
  const [tracking, setTracking] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    dispatch(fetchOrderDetail(orderId));
    loadTrackingData();
  }, [dispatch, orderId]);

  const loadTrackingData = async () => {
    try {
      const trackingData = await orderService.trackOrder(orderId);
      setTracking(trackingData);
    } catch (error) {
      console.error('Error loading tracking data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchOrderDetail(orderId)),
      loadTrackingData()
    ]);
    setRefreshing(false);
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Отменить заказ',
      'Вы уверены, что хотите отменить этот заказ?',
      [
        {
          text: 'Нет',
          style: 'cancel',
        },
        {
          text: 'Да, отменить',
          style: 'destructive',
          onPress: cancelOrderAction,
        },
      ]
    );
  };

  const cancelOrderAction = async () => {
    try {
      setCancelling(true);
      await dispatch(cancelOrder(orderId)).unwrap();
      Alert.alert(
        'Успешно',
        'Заказ отменен',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось отменить заказ');
    } finally {
      setCancelling(false);
    }
  };

  const handleRepeatOrder = () => {
    Alert.alert(
      'Повторить заказ',
      'Добавить все товары из этого заказа в корзину?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Добавить',
          onPress: async () => {
            try {
              await orderService.repeatOrder(orderId);
              Alert.alert('Товары добавлены', 'Товары из заказа добавлены в корзину');
              navigation.navigate('Cart');
            } catch (error) {
              console.error('Error repeating order:', error);
              Alert.alert('Ошибка', 'Не удалось повторить заказ');
            }
          },
        },
      ]
    );
  };

  const handleCallSupport = () => {
    const phoneNumber = '+375291234567';
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#F39C12';
      case 'confirmed':
        return colors.accent;
      case 'preparing':
        return '#9B59B6';
      case 'ready':
        return colors.success;
      case 'delivering':
        return colors.accent;
      case 'delivered':
        return colors.success;
      case 'cancelled':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Ожидает подтверждения';
      case 'confirmed':
        return 'Подтвержден';
      case 'preparing':
        return 'Готовится';
      case 'ready':
        return 'Готов';
      case 'delivering':
        return 'Доставляется';
      case 'delivered':
        return 'Доставлен';
      case 'cancelled':
        return 'Отменен';
      default:
        return 'Неизвестно';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canCancelOrder = (status) => {
    return ['pending', 'confirmed'].includes(status);
  };

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.product?.name}</Text>
        {item.size && (
          <Text style={styles.itemOption}>Размер: {item.size.name}</Text>
        )}
        {item.addons && item.addons.length > 0 && (
          <Text style={styles.itemOption}>
            Добавки: {item.addons.map(addon => addon.name).join(', ')}
          </Text>
        )}
        <Text style={styles.itemPrice}>Цена за единицу: {item.price} BYN</Text>
      </View>
      <View style={styles.itemPricing}>
        <Text style={styles.itemQuantity}>{item.quantity} шт.</Text>
        <Text style={styles.itemTotal}>
          {(num(item.price) * item.quantity).toFixed(2)} BYN
        </Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#079b59" />
        <Text style={styles.loadingText}>Загрузка заказа...</Text>
      </View>
    );
  }

  if (error || !currentOrder) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Ошибка загрузки</Text>
        <Text style={styles.errorText}>
          Не удалось загрузить информацию о заказе
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => dispatch(fetchOrderDetail(orderId))}
        >
          <Text style={styles.retryButtonText}>Попробовать снова</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.accent]}
        />
      }
    >
      {/* Заголовок */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Заказ №{currentOrder.id}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Статус заказа */}
      <View style={styles.statusSection}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(currentOrder.status) },
          ]}
        >
          <Text style={styles.statusText}>
            {getStatusText(currentOrder.status)}
          </Text>
        </View>
        <Text style={styles.orderDate}>
          Создан: {formatDate(currentOrder.created_at)}
        </Text>
        {currentOrder.updated_at !== currentOrder.created_at && (
          <Text style={styles.orderDate}>
            Обновлен: {formatDate(currentOrder.updated_at)}
          </Text>
        )}
      </View>

      {/* Информация о доставке */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Информация о получении</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Способ получения:</Text>
          <Text style={styles.infoValue}>
            {currentOrder.delivery_type === 'delivery' ? '🚚 Доставка' : '🏪 Самовывоз'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Способ оплаты:</Text>
          <Text style={styles.infoValue}>
            {currentOrder.payment_method === 'cash' ? '💵 Наличными' : '💳 Картой'}
          </Text>
        </View>
        {currentOrder.delivery_address && (
          <View style={styles.addressContainer}>
            <Text style={styles.infoLabel}>Адрес доставки:</Text>
            <Text style={styles.addressText}>
              {currentOrder.delivery_address.street}, д. {currentOrder.delivery_address.house}
              {currentOrder.delivery_address.apartment && `, кв. ${currentOrder.delivery_address.apartment}`}
              {currentOrder.delivery_address.entrance && `, подъезд ${currentOrder.delivery_address.entrance}`}
              {currentOrder.delivery_address.floor && `, этаж ${currentOrder.delivery_address.floor}`}
            </Text>
            {currentOrder.delivery_address.comment && (
              <Text style={styles.addressComment}>
                Комментарий: {currentOrder.delivery_address.comment}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Контактная информация */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Контактная информация</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Имя:</Text>
          <Text style={styles.infoValue}>{currentOrder.contact_name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Телефон:</Text>
          <Text style={styles.infoValue}>{currentOrder.contact_phone}</Text>
        </View>
        {currentOrder.contact_email && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{currentOrder.contact_email}</Text>
          </View>
        )}
      </View>

      {/* Состав заказа */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Состав заказа</Text>
        <FlatList
          data={currentOrder.items}
          renderItem={renderOrderItem}
          keyExtractor={(item, index) => index.toString()}
          scrollEnabled={false}
        />
      </View>

      {/* Комментарий к заказу */}
      {currentOrder.comment && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Комментарий к заказу</Text>
          <Text style={styles.commentText}>{currentOrder.comment}</Text>
        </View>
      )}

      {/* Итоговая сумма */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Итого</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Сумма заказа:</Text>
          <Text style={styles.summaryValue}>
            {num(currentOrder.total_amount).toFixed(2)} BYN
          </Text>
        </View>
        {currentOrder.delivery_type === 'delivery' && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Доставка:</Text>
            <Text style={styles.summaryValue}>5.00 BYN</Text>
          </View>
        )}
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Итого к оплате:</Text>
          <Text style={styles.totalValue}>
            {currentOrder.total_amount} BYN
          </Text>
        </View>
      </View>

      {/* Кнопки действий */}
      <View style={styles.actionsSection}>
        {canCancelOrder(currentOrder.status) && (
          <TouchableOpacity
            style={[styles.cancelButton, cancelling && styles.cancelButtonDisabled]}
            onPress={handleCancelOrder}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.cancelButtonText}>Отменить заказ</Text>
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.reorderButton}
          onPress={handleRepeatOrder}
        >
          <Text style={styles.reorderButtonText}>Повторить заказ</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.supportButton}
          onPress={handleCallSupport}
        >
          <Text style={styles.supportButtonText}>Связаться с поддержкой</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.accent,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.buttonText,
  },
  placeholder: {
    width: 60,
  },
  statusSection: {
    backgroundColor: colors.cardBg,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 10,
  },
  statusText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderDate: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  section: {
    backgroundColor: colors.cardBg,
    marginTop: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  addressContainer: {
    marginTop: 10,
  },
  addressText: {
    fontSize: 16,
    color: colors.text,
    marginTop: 5,
    lineHeight: 22,
  },
  addressComment: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 5,
    fontStyle: 'italic',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.hoverBg,
  },
  itemInfo: {
    flex: 1,
    marginRight: 15,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  itemOption: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  itemPricing: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.accent,
  },
  commentText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  summarySection: {
    backgroundColor: colors.cardBg,
    marginTop: 10,
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: colors.text,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.accent,
  },
  actionsSection: {
    padding: 20,
    paddingBottom: 40,
  },
  cancelButton: {
    backgroundColor: colors.error,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  reorderButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  reorderButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: colors.bg,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  supportButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 12,
  },
  supportButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OrderDetailScreen;