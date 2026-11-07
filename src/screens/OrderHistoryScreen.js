import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Alert from '../utils/alertShim';
import useAppTheme from '../theme/useAppTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrderHistory, cancelOrder } from '../store/slices/orderSlice';
import { orderService } from '../services';
// ИСПРАВЛЕНО ПРИ АУДИТЕ: прямой импорт react-native-vector-icons в v10.x
// не тянет шрифт — иконки рендерились пустыми квадратами.
import Icon from '../components/ui/Icon';

const OrderHistoryScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const dispatch = useDispatch();
  const { orders, isLoading, error } = useSelector((state) => state.order);
  const { user } = useSelector((state) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [dispatch, user]);

  const loadOrders = async (pageNum = 1, isRefresh = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      await dispatch(fetchOrderHistory()).unwrap();
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить историю заказов');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    loadOrders(1, true);
  };

  const loadMoreOrders = () => {
    if (hasMore && !loadingMore && !loading) {
      loadOrders(page + 1);
    }
  };

  const handleCancelOrder = (orderId) => {
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
          onPress: async () => {
            try {
              await dispatch(cancelOrder(orderId)).unwrap();
              Alert.alert('Успешно', 'Заказ отменен');
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось отменить заказ');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#F39C12';
      case 'confirmed':
        return colors.accent;
      case 'preparing':
      case 'in_progress':
        return '#9B59B6';
      case 'ready':
        return colors.success;
      case 'delivering':
      case 'out_for_delivery':
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
      case 'in_progress':
        return 'Готовится';
      case 'ready':
        return 'Готов';
      case 'delivering':
      case 'out_for_delivery':
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

  const handleRepeatOrder = async (orderId) => {
    try {
      await orderService.repeatOrder(orderId);
      navigation.navigate('Cart');
    } catch (error) {
      console.error('Error repeating order:', error);
      Alert.alert('Ошибка', 'Не удалось повторить заказ');
    }
  };

  const handleViewReceipt = async (orderId) => {
    try {
      const receipt = await orderService.getOrderReceipt(orderId);
      // Handle receipt display or download
      console.log('Receipt:', receipt);
    } catch (error) {
      console.error('Error getting receipt:', error);
      Alert.alert('Ошибка', 'Не удалось получить чек');
    }
  };

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>Заказ №{item.id}</Text>
          <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.deliveryType}>
          {item.delivery_type === 'delivery' ? '🚚 Доставка' : '🏪 Самовывоз'}
        </Text>
        <Text style={styles.paymentMethod}>
          {item.payment_method === 'cash' ? '💵 Наличными' : '💳 Картой'}
        </Text>
      </View>

      <View style={styles.orderItems}>
        <Text style={styles.itemsTitle}>Состав заказа:</Text>
        {item.items && item.items.slice(0, 3).map((orderItem, index) => (
          <Text key={index} style={styles.itemText} numberOfLines={1}>
            • {orderItem.product?.name} x{orderItem.quantity}
            {orderItem.size && ` (${orderItem.size.name})`}
          </Text>
        ))}
        {item.items && item.items.length > 3 && (
          <Text style={styles.moreItems}>
            ... и еще {item.items.length - 3} товар(ов)
          </Text>
        )}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.totalAmount}>
          Итого: {item.total_amount} BYN
        </Text>
        {canCancelOrder(item.status) && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={(e) => {
              e.stopPropagation();
              handleCancelOrder(item.id);
            }}
          >
            <Text style={styles.cancelButtonText}>Отменить</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.orderActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            handleRepeatOrder(item.id);
          }}
        >
          <Icon name="refresh" size={16} color="#079b59" />
          <Text style={styles.actionButtonText}>Повторить</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            handleViewReceipt(item.id);
          }}
        >
          <Icon name="receipt" size={16} color="#079b59" />
          <Text style={styles.actionButtonText}>Чек</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>История заказов пуста</Text>
      <Text style={styles.emptyStateText}>
        Здесь будут отображаться ваши заказы
      </Text>
      <TouchableOpacity
        style={styles.shopButton}
        onPress={() => navigation.navigate('Catalog')}
      >
        <Text style={styles.shopButtonText}>Перейти к покупкам</Text>
      </TouchableOpacity>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>Ошибка загрузки</Text>
      <Text style={styles.errorText}>
        Не удалось загрузить историю заказов
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => dispatch(fetchOrderHistory())}
      >
        <Text style={styles.retryButtonText}>Попробовать снова</Text>
      </TouchableOpacity>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.authRequired}>
        <Text style={styles.authTitle}>Требуется авторизация</Text>
        <Text style={styles.authText}>
          Войдите в аккаунт, чтобы просмотреть историю заказов
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Войти</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>История заказов</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#079b59" />
          <Text style={styles.loadingText}>Загрузка заказов...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && orders.length === 0) {
    return renderError();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>История заказов</Text>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContainer,
          orders.length === 0 && styles.emptyContainer,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor="#079b59"
          />
        }
        onEndReached={loadMoreOrders}
        onEndReachedThreshold={0.1}
        ListFooterComponent={() => {
          if (loadingMore) {
            return (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#079b59" />
                <Text style={styles.footerLoaderText}>Загрузка...</Text>
              </View>
            );
          }
          return null;
        }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Icon name="receipt-long" size={64} color="#ccc" />
            <Text style={styles.emptyText}>У вас пока нет заказов</Text>
            <Text style={styles.emptySubtext}>Оформите первый заказ в каталоге</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.accent,
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.buttonText,
  },
  listContainer: {
    padding: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  orderCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: colors.textMuted,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: colors.buttonText,
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  deliveryType: {
    fontSize: 14,
    color: colors.text,
  },
  paymentMethod: {
    fontSize: 14,
    color: colors.text,
  },
  orderItems: {
    marginBottom: 12,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  itemText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 2,
  },
  moreItems: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.hoverBg,
    paddingTop: 12,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.accent,
  },
  cancelButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: colors.buttonText,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  authRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  authText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMuted,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.hoverBg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.accentRgba,
  },
  actionButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerLoaderText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default OrderHistoryScreen;