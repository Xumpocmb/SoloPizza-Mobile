import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import Alert from '../utils/alertShim';
import useAppTheme from '../theme/useAppTheme';
import { num } from '../utils/money';
import ProductImage from '../components/ui/ProductImage';
import { SafeAreaView } from 'react-native-safe-area-context';
// ИСПРАВЛЕНО ПРИ АУДИТЕ: прямой импорт react-native-vector-icons в v10.x
// не тянет шрифт — иконки рендерились пустыми квадратами.
import Icon from '../components/ui/Icon';
import { useDispatch, useSelector } from 'react-redux';
import {
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
} from '../store/slices/cartSlice';

const CartScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const dispatch = useDispatch();
  const { items } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  
  const [refreshing, setRefreshing] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const cartItems = items; // единственный источник — redux cartSlice (persist в AsyncStorage)
  const [cartSummary, setCartSummary] = useState({ total: 0, discount: 0, delivery: 0 });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    // Корзина локальная (redux + AsyncStorage): в app_api друга эндпоинтов
    // корзины нет, серверные вызовы давали 404 и красные тосты LogBox.
    setLoading(false);
  };

  const calculateTotal = () => {
    if (cartSummary.total) {
      return cartSummary;
    }
    
    const subtotal = cartItems.reduce((sum, item) => sum + (num(item.price) * item.quantity), 0);
    // Скидки и доставку считает сервер друга (quote_cart из plan.txt), когда
    // появятся эндпоинты заказов. Плейсхолдеры 150/10% убраны как выдуманные.
    const discount = 0;
    const delivery = 0;
    const total = subtotal - discount + delivery;
    
    return {
      subtotal,
      discount,
      delivery,
      total,
    };
  };

  // Вычисляем общую сумму и количество товаров
  const totalAmount = items.reduce((sum, item) => sum + (num(item.price) * item.quantity), 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity === 0) {
      removeItem(itemId);
      return;
    }
    
    try {
      setUpdating(true);
      await dispatch(updateCartItemQuantity({ itemId, quantity: newQuantity })).unwrap();
    } catch (error) {
      // обновление количества — локальная операция, сюрпризов не ждём
    } finally {
      setUpdating(false);
    }
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
    } else {
      dispatch(updateCartItemQuantity({ itemId, quantity: newQuantity }));
    }
  };

  const removeItem = (itemId) => {
    Alert.alert(
      'Удалить товар',
      'Вы уверены, что хотите удалить этот товар из корзины?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              await dispatch(removeFromCart(itemId)).unwrap();
            } catch (error) {
              // удаление локальное, сюрпризов не ждём
            } finally {
              setUpdating(false);
            }
          }
        },
      ]
    );
  };

  const handleRemoveItem = (itemId) => {
    Alert.alert(
      'Удалить товар',
      'Вы уверены, что хотите удалить этот товар из корзины?',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            dispatch(removeFromCart(itemId));
          },
        },
      ]
    );
  };

  const handleClearCart = () => {
    Alert.alert(
      'Очистить корзину',
      'Вы уверены, что хотите удалить все товары из корзины?',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: () => {
            dispatch(clearCart());
          },
        },
      ]
    );
  };

  const handleCheckout = () => {
    if (!user) {
      Alert.alert(
        'Требуется авторизация',
        'Для оформления заказа необходимо войти в аккаунт',
        [
          {
            text: 'Отмена',
            style: 'cancel',
          },
          {
            text: 'Войти',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
      return;
    }

    if (items.length === 0) {
      Alert.alert('Пустая корзина', 'Добавьте товары в корзину для оформления заказа');
      return;
    }

    navigation.navigate('Checkout');
  };

  const applyPromoCode = async () => {
    if (promoCode.trim() === '') {
      Alert.alert('Ошибка', 'Введите промокод');
      return;
    }
    
    try {
      setUpdating(true);
      // Сервера промокодов в app_api пока нет: честно говорим об этом,
      // вместо 404 и красного тоста. Подключим вместе с эндпоинтами заказов.
      Alert.alert('Промокод', 'Сервер промокодов ещё не подключён. Скидки появятся вместе с оформлением заказа.');
    } finally {
      setUpdating(false);
    }
  };

  const removePromoCode = async () => {
    try {
      setUpdating(true);
      setPromoApplied(false);
      setPromoCode('');
    } catch (error) {
      setPromoApplied(false);
      setPromoCode('');
    } finally {
      setUpdating(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Имитируем обновление
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const renderCartItem = ({ item }) => {
    const itemTotal = (num(item.price) * item.quantity).toFixed(2);

    return (
      <View style={styles.cartItem}>
        <ProductImage
          uri={item.image || item.product?.main_image}
          style={styles.itemImage}
          emojiSize={28}
        />
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.name || item.product?.name || 'Товар'}
          </Text>
          
          {/* Размер */}
          {item.size && (
            <Text style={styles.itemOption}>
              Размер: {item.size.name} ({item.size.size})
            </Text>
          )}
          
          {/* Добавки */}
          {item.toppings && item.toppings.length > 0 && (
            <Text style={styles.itemOption}>
              Добавки: {item.toppings.map(topping => topping.name).join(', ')}
            </Text>
          )}
          
          <View style={styles.itemFooter}>
            <Text style={styles.itemPrice}>{num(item.price ?? item.total_price).toFixed(2)} BYN за шт.</Text>
            <Text style={styles.itemTotal}>Итого: {itemTotal} BYN</Text>
          </View>
        </View>
        
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={[styles.quantityButton, updating && styles.quantityButtonDisabled]}
            onPress={() => updateQuantity(item.id, item.quantity - 1)}
            disabled={updating}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity
            style={[styles.quantityButton, updating && styles.quantityButtonDisabled]}
            onPress={() => updateQuantity(item.id, item.quantity + 1)}
            disabled={updating}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.removeButton, updating && styles.removeButtonDisabled]}
            onPress={() => removeItem(item.id)}
            disabled={updating}
          >
            <Text style={styles.removeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🛒</Text>
      <Text style={styles.emptyTitle}>Корзина пуста</Text>
      <Text style={styles.emptySubtitle}>
        Добавьте товары из каталога, чтобы оформить заказ
      </Text>
      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => navigation.navigate('Catalog')}
      >
        <Text style={styles.continueButtonText}>Перейти к покупкам</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCartSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Товаров:</Text>
        <Text style={styles.summaryValue}>{totalItems} шт.</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Сумма:</Text>
        <Text style={styles.summaryValue}>{num(totalAmount).toFixed(2)} BYN</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryRow}>
        <Text style={styles.totalLabel}>Итого к оплате:</Text>
        <Text style={styles.totalValue}>{totalAmount.toFixed(2)} BYN</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Заголовок */}
      <View style={styles.header}>
        <Text style={styles.title}>Корзина</Text>
        {items.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearCart}
          >
            <Text style={styles.clearButtonText}>Очистить</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        renderEmptyCart()
      ) : (
        <>
          {/* Список товаров */}
          <FlatList
            data={items}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.cartList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.accent]}
              />
            }
            ListFooterComponent={renderCartSummary}
          />

          {/* Нижняя панель с кнопкой оформления */}
          <View style={styles.bottomPanel}>
            <View style={styles.totalContainer}>
              <Text style={styles.bottomTotalLabel}>Итого:</Text>
              <Text style={styles.bottomTotalValue}>
                {totalAmount.toFixed(2)} BYN
              </Text>
            </View>
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutButtonText}>
                Оформить заказ
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.accent,
    paddingTop: Platform.OS === 'web' ? 12 : 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.buttonText,
    textAlign: 'center',
  },
  clearButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    bordercolor: colors.buttonText,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  clearButtonText: {
    color: colors.buttonText,
    fontSize: 14,
    fontWeight: '600',
  },
  cartList: {
    paddingBottom: 24,
  },
  cartItem: {
    backgroundColor: colors.cardBg,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  itemImage: {
    width: 90,
    height: 90,
    borderRadius: 20,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  itemOption: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
    fontWeight: '500',
  },
  itemFooter: {
    marginTop: 8,
  },
  itemPrice: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  itemTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
    marginTop: 4,
  },
  quantityControls: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 12,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  quantityButtonText: {
    color: colors.buttonText,
    fontSize: 18,
    fontWeight: '700',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginVertical: 10,
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 20,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  removeButtonText: {
    color: colors.buttonText,
    fontSize: 20,
    fontWeight: '700',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  summaryContainer: {
    backgroundColor: colors.cardBg,
    margin: 20,
    borderRadius: 20,
    padding: 24,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.accent,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 100,
    color: colors.divider,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bottomPanel: {
    backgroundColor: colors.cardBg,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  bottomTotalLabel: {
    fontSize: 18,
    color: colors.text,
  },
  bottomTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.accent,
  },
  checkoutButton: {
    backgroundColor: colors.accent,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkoutButtonText: {
    color: colors.buttonText,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default CartScreen;