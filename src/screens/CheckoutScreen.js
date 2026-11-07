import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import Alert from '../utils/alertShim';
import useAppTheme from '../theme/useAppTheme';
import { num } from '../utils/money';
import { useDispatch, useSelector } from 'react-redux';
import { createOrder } from '../store/slices/orderSlice';
import { clearCart } from '../store/slices/cartSlice';
import { orderService, cartService, userService } from '../services';

const CheckoutScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const dispatch = useDispatch();
  const { items, totalAmount } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const { isLoading } = useSelector((state) => state.order);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);

  const [deliveryType, setDeliveryType] = useState('delivery'); // 'delivery' или 'pickup'
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' или 'card'
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    house: '',
    apartment: '',
    entrance: '',
    floor: '',
    comment: '',
  });
  const [contactInfo, setContactInfo] = useState({
    name: user?.first_name + ' ' + user?.last_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });
  const [orderComment, setOrderComment] = useState('');
  const [errors, setErrors] = useState({});

  // Доставка/скидки считаются на сервере (quote_cart появится у друга). Пока не выдумываем цифру.
  const deliveryFee = 0;
  const finalTotal = totalAmount + deliveryFee;

  useEffect(() => {
    loadCheckoutData();
    loadUserData();
    
    if (items.length === 0) {
      Alert.alert(
        'Пустая корзина',
        'Корзина пуста. Добавьте товары для оформления заказа.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Catalog'),
          },
        ]
      );
    }
  }, [items, navigation]);

  const loadCheckoutData = async () => {
    try {
      setLoading(true);
      const [deliveryOpts, paymentOpts] = await Promise.all([
        orderService.getDeliveryOptions(),
        orderService.getPaymentMethods(),
      ]);
      
      setDeliveryOptions(deliveryOpts || []);
      setPaymentMethods(paymentOpts || []);
    } catch (error) {
      console.error('Error loading checkout data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const [profile, addresses] = await Promise.all([
        userService.getProfile(),
        userService.getAddresses(),
      ]);
      
      setUserProfile(profile);
      setSavedAddresses(addresses || []);
      
      // Pre-fill contact info from profile
      if (profile) {
        setContactInfo(prev => ({
          ...prev,
          name: profile.first_name && profile.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : prev.name,
          phone: profile.phone || prev.phone,
          email: profile.email || prev.email,
        }));
      }
      
      // Set default address if available
      const defaultAddress = addresses?.find(addr => addr.is_default);
      if (defaultAddress && deliveryType === 'delivery') {
        setDeliveryAddress(prev => ({
          ...prev,
          street: defaultAddress.street || '',
          house: defaultAddress.house || '',
          apartment: defaultAddress.apartment || '',
          entrance: defaultAddress.entrance || '',
          floor: defaultAddress.floor || '',
          comment: defaultAddress.comment || '',
        }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Валидация контактной информации
    if (!contactInfo.name.trim()) {
      newErrors.name = 'Имя обязательно';
    }
    if (!contactInfo.phone.trim()) {
      newErrors.phone = 'Телефон обязателен';
    } else if (!/^\+?[1-9]\d{1,14}$/.test(contactInfo.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Неверный формат телефона';
    }

    // Валидация адреса доставки (только для доставки)
    if (deliveryType === 'delivery') {
      if (!deliveryAddress.street.trim()) {
        newErrors.street = 'Улица обязательна';
      }
      if (!deliveryAddress.house.trim()) {
        newErrors.house = 'Номер дома обязателен';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (section, field, value) => {
    if (section === 'contact') {
      setContactInfo(prev => ({ ...prev, [field]: value }));
    } else if (section === 'address') {
      setDeliveryAddress(prev => ({ ...prev, [field]: value }));
    }
    
    // Очищаем ошибку для поля при вводе
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleCreateOrder = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      
      // Validate order before creating
      const validation = await orderService.validateOrder({
        delivery_type: deliveryType,
        payment_method: paymentMethod,
        address: deliveryType === 'delivery' ? deliveryAddress : null,
        customer_info: contactInfo,
      });
      
      if (!validation.valid) {
        Alert.alert('Ошибка', validation.message || 'Проверьте данные заказа');
        return;
      }

      const orderData = {
        items: items.map(item => ({
          product_id: item.productId ?? item.product?.id,
          quantity: item.quantity,
          size_id: item.size?.id,
          addon_ids: item.addons?.map(addon => addon.id) || [],
          price: item.price,
        })),
        delivery_type: deliveryType,
        payment_method: paymentMethod,
        contact_name: contactInfo.name.trim(),
        contact_phone: contactInfo.phone.trim(),
        contact_email: contactInfo.email.trim(),
        delivery_address: deliveryType === 'delivery' ? {
          street: deliveryAddress.street.trim(),
          house: deliveryAddress.house.trim(),
          apartment: deliveryAddress.apartment.trim(),
          entrance: deliveryAddress.entrance.trim(),
          floor: deliveryAddress.floor.trim(),
          comment: deliveryAddress.comment.trim(),
        } : null,
        comment: orderComment.trim(),
        total_amount: finalTotal,
      };

      const result = await dispatch(createOrder(orderData)).unwrap();
      
      // Process payment if needed
      if (paymentMethod === 'card') {
        const paymentResult = await orderService.processPayment(result.id, {
          method: 'card',
          amount: finalTotal,
        });
        
        if (!paymentResult.success) {
          Alert.alert('Ошибка оплаты', paymentResult.message || 'Не удалось обработать платеж');
          return;
        }
      }
      
      // Очищаем корзину после успешного создания заказа
      dispatch(clearCart());
      
      Alert.alert(
        'Заказ оформлен!',
        `Ваш заказ №${result.order_number || result.id} принят в обработку. Ожидаемое время ${deliveryType === 'delivery' ? 'доставки' : 'готовности'}: ${result.estimated_time || '30-45'} минут.`,
        [
          {
            text: 'Отслеживать заказ',
            onPress: () => navigation.navigate('OrderDetail', { orderId: result.id }),
          },
          {
            text: 'Перейти к заказам',
            onPress: () => navigation.navigate('OrderHistory'),
          },
          {
            text: 'На главную',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );
    } catch (error) {
      console.error('Error placing order:', error);
      
      let errorMessage = 'Не удалось оформить заказ. Попробуйте еще раз.';
      
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.items) {
          errorMessage = 'Проверьте товары в корзине';
        } else if (errorData.delivery_address) {
          errorMessage = 'Проверьте адрес доставки';
        }
      } else if (error.response?.status === 402) {
        errorMessage = 'Недостаточно средств для оплаты заказа';
      } else if (error.response?.status === 409) {
        errorMessage = 'Некоторые товары недоступны. Обновите корзину.';
      }
      
      Alert.alert('Ошибка оформления заказа', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.product?.name}
        </Text>
        {item.size && (
          <Text style={styles.itemOption}>Размер: {item.size.name}</Text>
        )}
        {item.addons && item.addons.length > 0 && (
          <Text style={styles.itemOption}>
            Добавки: {item.addons.map(addon => addon.name).join(', ')}
          </Text>
        )}
      </View>
      <View style={styles.itemPricing}>
        <Text style={styles.itemQuantity}>{item.quantity} шт.</Text>
        <Text style={styles.itemPrice}>
          {(num(item.price) * item.quantity).toFixed(2)} BYN
        </Text>
      </View>
    </View>
  );

  if (items.length === 0) {
    return null; // Компонент не рендерится, если корзина пуста
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Заголовок */}
      <View style={styles.header}>
        <Text style={styles.title}>Оформление заказа</Text>
      </View>

      {/* Тип получения заказа */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Способ получения</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              deliveryType === 'delivery' && styles.optionButtonActive,
            ]}
            onPress={() => setDeliveryType('delivery')}
          >
            <Text
              style={[
                styles.optionText,
                deliveryType === 'delivery' && styles.optionTextActive,
              ]}
            >
              🚚 Доставка (+5.00 BYN)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.optionButton,
              deliveryType === 'pickup' && styles.optionButtonActive,
            ]}
            onPress={() => setDeliveryType('pickup')}
          >
            <Text
              style={[
                styles.optionText,
                deliveryType === 'pickup' && styles.optionTextActive,
              ]}
            >
              🏪 Самовывоз
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Адрес доставки */}
      {deliveryType === 'delivery' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Адрес доставки</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Улица *</Text>
            <TextInput
              style={[
                styles.input,
                errors.street && styles.inputError,
              ]}
              placeholder="Название улицы"
              placeholderTextColor={colors.textMuted}
              value={deliveryAddress.street}
              onChangeText={(value) => handleInputChange('address', 'street', value)}
            />
            {errors.street && (
              <Text style={styles.errorText}>{errors.street}</Text>
            )}
          </View>
          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Дом *</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.house && styles.inputError,
                ]}
                placeholder="№"
                placeholderTextColor={colors.textMuted}
                value={deliveryAddress.house}
                onChangeText={(value) => handleInputChange('address', 'house', value)}
              />
              {errors.house && (
                <Text style={styles.errorText}>{errors.house}</Text>
              )}
            </View>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Квартира</Text>
              <TextInput
                style={styles.input}
                placeholder="№"
                placeholderTextColor={colors.textMuted}
                value={deliveryAddress.apartment}
                onChangeText={(value) => handleInputChange('address', 'apartment', value)}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Подъезд</Text>
              <TextInput
                style={styles.input}
                placeholder="№"
                placeholderTextColor={colors.textMuted}
                value={deliveryAddress.entrance}
                onChangeText={(value) => handleInputChange('address', 'entrance', value)}
              />
            </View>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Этаж</Text>
              <TextInput
                style={styles.input}
                placeholder="№"
                placeholderTextColor={colors.textMuted}
                value={deliveryAddress.floor}
                onChangeText={(value) => handleInputChange('address', 'floor', value)}
              />
            </View>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Комментарий к адресу</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Дополнительная информация для курьера"
              placeholderTextColor={colors.textMuted}
              value={deliveryAddress.comment}
              onChangeText={(value) => handleInputChange('address', 'comment', value)}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      )}

      {/* Контактная информация */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Контактная информация</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Имя *</Text>
          <TextInput
            style={[
              styles.input,
              errors.name && styles.inputError,
            ]}
            placeholder="Ваше имя"
            placeholderTextColor={colors.textMuted}
            value={contactInfo.name}
            onChangeText={(value) => handleInputChange('contact', 'name', value)}
          />
          {errors.name && (
            <Text style={styles.errorText}>{errors.name}</Text>
          )}
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Телефон *</Text>
          <TextInput
            style={[
              styles.input,
              errors.phone && styles.inputError,
            ]}
            placeholder="+375 (XX) XXX-XX-XX"
            placeholderTextColor={colors.textMuted}
            value={contactInfo.phone}
            onChangeText={(value) => handleInputChange('contact', 'phone', value)}
            keyboardType="phone-pad"
          />
          {errors.phone && (
            <Text style={styles.errorText}>{errors.phone}</Text>
          )}
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor={colors.textMuted}
            value={contactInfo.email}
            onChangeText={(value) => handleInputChange('contact', 'email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Способ оплаты */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Способ оплаты</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              paymentMethod === 'cash' && styles.optionButtonActive,
            ]}
            onPress={() => setPaymentMethod('cash')}
          >
            <Text
              style={[
                styles.optionText,
                paymentMethod === 'cash' && styles.optionTextActive,
              ]}
            >
              💵 Наличными
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.optionButton,
              paymentMethod === 'card' && styles.optionButtonActive,
            ]}
            onPress={() => setPaymentMethod('card')}
          >
            <Text
              style={[
                styles.optionText,
                paymentMethod === 'card' && styles.optionTextActive,
              ]}
            >
              💳 Картой
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Комментарий к заказу */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Комментарий к заказу</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Дополнительные пожелания к заказу"
          placeholderTextColor={colors.textMuted}
          value={orderComment}
          onChangeText={setOrderComment}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Состав заказа */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ваш заказ</Text>
        <FlatList
          data={items}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
        />
      </View>

      {/* Итоговая сумма */}
      <View style={styles.summarySection}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Сумма заказа:</Text>
          <Text style={styles.summaryValue}>{num(totalAmount).toFixed(2)} BYN</Text>
        </View>
        {deliveryType === 'delivery' && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Доставка:</Text>
            <Text style={styles.summaryValue}>{num(deliveryFee).toFixed(2)} BYN</Text>
          </View>
        )}
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Итого к оплате:</Text>
          <Text style={styles.totalValue}>{num(finalTotal).toFixed(2)} BYN</Text>
        </View>
      </View>

      {/* Кнопка оформления */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[
            styles.orderButton,
            (isLoading || submitting) && styles.orderButtonDisabled,
          ]}
          onPress={handleCreateOrder}
          disabled={isLoading || submitting}
        >
          {(isLoading || submitting) ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.orderButtonText}>
              Оформить заказ на {num(finalTotal).toFixed(2)} BYN
            </Text>
          )}
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
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.buttonText,
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
  optionsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
  optionTextActive: {
    color: colors.buttonText,
  },
  inputContainer: {
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    color: colors.text,
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  inputError: {
    borderColor: colors.error,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: 5,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hoverBg,
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  itemOption: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  itemPricing: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.accent,
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
  bottomSection: {
    padding: 20,
    paddingBottom: 40,
  },
  orderButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  orderButtonDisabled: {
    backgroundColor: colors.divider,
    elevation: 0,
    shadowOpacity: 0,
  },
  orderButtonText: {
    color: colors.buttonText,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CheckoutScreen;