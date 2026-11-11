/**
 * Оформление заказа из серверной корзины (Xumpocmb/SoloPizza#3).
 * Итог со скидками и доставкой считает сервер (/checkout/quote/); приложение
 * присылает только контакты и выбор способов. Только после входа.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch } from 'react-redux';
import Alert from '../utils/alertShim';
import useAppTheme from '../theme/useAppTheme';
import { apiService, orderService } from '../services';
import { newClientOrderId } from '../services/orderService';
import { loadCart } from '../store/slices/cartSlice';
import { PRIVACY_URL } from '../config/api';
import { num } from '../utils/money';
import { apiErrorMessage, apiFieldErrors } from '../utils/apiError';

const money = (value) => `${num(value).toFixed(2)} BYN`;

export default function CheckoutScreen({ navigation }) {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const dispatch = useDispatch();

  const [authed, setAuthed] = useState(null); // null — ещё проверяем
  const [options, setOptions] = useState(null);
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [quote, setQuote] = useState(null);
  const [form, setForm] = useState({ customer_name: '', phone: '', address: '', comment: '' });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  // один id на попытку оформления: повтор после обрыва сети вернёт тот же заказ
  const clientOrderId = useRef(newClientOrderId());

  useEffect(() => {
    apiService.getAuthToken().then(async (token) => {
      if (!token) {
        setAuthed(false);
        return;
      }
      try {
        const [checkout, me] = await Promise.all([orderService.getCheckoutOptions(), orderService.getMe()]);
        setOptions(checkout);
        setForm((prev) => ({
          ...prev,
          customer_name: prev.customer_name || [me.first_name, me.last_name].filter(Boolean).join(' '),
          phone: prev.phone || me.phone || '',
        }));
        setAuthed(true);
      } catch (error) {
        setAuthed(error?.status !== 401);
        if (error?.status !== 401) Alert.alert('Оформление', apiErrorMessage(error));
      }
    });
  }, []);

  useEffect(() => {
    if (!authed) return;
    orderService
      .quote(deliveryType)
      .then(setQuote)
      .catch((error) => Alert.alert('Не удалось посчитать итог', apiErrorMessage(error)));
  }, [authed, deliveryType]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const submit = async () => {
    const local = {};
    if (!form.customer_name.trim()) local.customer_name = 'Укажите имя';
    if (!form.phone.trim()) local.phone = 'Укажите телефон';
    if (deliveryType === 'delivery' && !form.address.trim()) local.address = 'Укажите адрес доставки';
    if (!consent) local.consent = 'Нужно согласие на обработку персональных данных';
    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }
    setSending(true);
    try {
      const order = await orderService.createOrder({
        client_order_id: clientOrderId.current,
        delivery_type: deliveryType,
        payment_method: paymentMethod,
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim(),
        address: deliveryType === 'delivery' ? form.address.trim() : '',
        comment: form.comment.trim(),
        consent: true,
      });
      clientOrderId.current = newClientOrderId();
      dispatch(loadCart()); // сервер очистил корзину после заказа
      navigation.replace('OrderDetail', { orderId: order.id, justCreated: true });
    } catch (error) {
      const fields = apiFieldErrors(error);
      const formFields = fields && Object.keys(fields).filter((key) => key in form || key === 'consent');
      if (formFields?.length) {
        setErrors(fields);
      } else {
        // закрыт филиал, пустая корзина, товар пропал из меню — сервер объясняет сам
        Alert.alert('Не удалось оформить заказ', apiErrorMessage(error));
      }
    } finally {
      setSending(false);
    }
  };

  if (authed === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!authed) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Войдите, чтобы оформить заказ</Text>
        <Text style={styles.muted}>Корзина сохранится и перейдёт в ваш аккаунт</Text>
        <TouchableOpacity style={styles.submit} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.submitText}>Войти</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const empty = quote && quote.lines.length === 0;
  const blocked = options && !options.available;

  const chips = (items, value, onChange) => (
    <View style={styles.chips}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.chip, value === item.id && styles.chipActive]}
          onPress={() => onChange(item.id)}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === item.id }}
        >
          <Text style={[styles.chipText, value === item.id && styles.chipTextActive]}>{item.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const field = (key, label, props = {}) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errors[key] && styles.inputError]}
        value={form[key]}
        onChangeText={(text) => setField(key, text)}
        placeholderTextColor={colors.textMuted}
        editable={!sending}
        {...props}
      />
      {errors[key] ? <Text style={styles.error}>{errors[key]}</Text> : null}
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {blocked && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{options.reason}</Text>
          </View>
        )}

        <Text style={styles.section}>Получение</Text>
        {options && chips(options.delivery_types, deliveryType, setDeliveryType)}
        {deliveryType === 'delivery' && field('address', 'Адрес доставки *', { placeholder: 'ул. Ленина, д. 1, кв. 1' })}

        <Text style={styles.section}>Контакты</Text>
        {field('customer_name', 'Имя *', { placeholder: 'Иван', maxLength: 100 })}
        {field('phone', 'Телефон *', { placeholder: '+375 (29) 123-45-67', keyboardType: 'phone-pad', maxLength: 32 })}

        <Text style={styles.section}>Оплата при получении</Text>
        {options && chips(options.payment_methods, paymentMethod, setPaymentMethod)}

        {field('comment', 'Комментарий', { placeholder: 'Пожелания к заказу', multiline: true, maxLength: 1000 })}

        <Text style={styles.section}>Итог</Text>
        {!quote ? (
          <ActivityIndicator color={colors.accent} />
        ) : empty ? (
          <Text style={styles.muted}>Корзина пуста</Text>
        ) : (
          <View style={styles.card}>
            {quote.lines.map((line) => (
              <View key={line.id} style={styles.row}>
                <Text style={styles.rowName} numberOfLines={1}>{`${line.name} × ${line.quantity}`}</Text>
                <Text style={styles.rowValue}>{money(line.total)}</Text>
              </View>
            ))}
            {num(quote.discount_amount) > 0 && (
              <View style={styles.row}>
                <Text style={styles.rowName}>Скидка</Text>
                <Text style={[styles.rowValue, styles.discount]}>−{money(quote.discount_amount)}</Text>
              </View>
            )}
            {deliveryType === 'delivery' && (
              <View style={styles.row}>
                <Text style={styles.rowName}>Доставка</Text>
                <Text style={styles.rowValue}>{num(quote.delivery_cost) > 0 ? money(quote.delivery_cost) : 'бесплатно'}</Text>
              </View>
            )}
            <View style={[styles.row, styles.totalRow]}>
              <Text style={styles.totalLabel}>К оплате</Text>
              <Text style={styles.totalValue}>{money(quote.total_price)}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.consentRow}
          onPress={() => {
            setConsent(!consent);
            if (errors.consent) setErrors((prev) => ({ ...prev, consent: null }));
          }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
        >
          <View style={[styles.checkbox, consent && styles.checkboxOn, errors.consent && styles.inputError]}>
            {consent ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.consentText}>
            Согласен(на) на обработку персональных данных в соответствии с{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>
              политикой обработки персональных данных
            </Text>
          </Text>
        </TouchableOpacity>
        {errors.consent ? <Text style={styles.error}>{errors.consent}</Text> : null}

        <TouchableOpacity
          style={[styles.submit, (sending || empty || blocked || !quote) && styles.submitDisabled]}
          onPress={submit}
          disabled={sending || empty || blocked || !quote}
        >
          <Text style={styles.submitText}>
            {sending ? 'Оформляем…' : `Оформить заказ${quote && !empty ? ` · ${money(quote.total_price)}` : ''}`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: colors.bg },
    title: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
    muted: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
    banner: { padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: colors.errorRgba },
    bannerText: { fontSize: 14, color: colors.text },
    section: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 18, marginBottom: 10 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.divider,
      backgroundColor: colors.cardBg,
    },
    chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipText: { fontSize: 14, color: colors.text },
    chipTextActive: { color: colors.buttonText, fontWeight: '600' },
    field: { marginTop: 12 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
    input: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.divider,
      color: colors.text,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
    },
    inputError: { borderColor: colors.error },
    error: { marginTop: 4, fontSize: 12, color: colors.error },
    card: { padding: 14, borderRadius: 12, gap: 8, backgroundColor: colors.cardBg },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    rowName: { flex: 1, fontSize: 14, color: colors.text },
    rowValue: { fontSize: 14, color: colors.text },
    discount: { color: colors.success },
    totalRow: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.divider },
    totalLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
    totalValue: { fontSize: 18, fontWeight: '700', color: colors.accent },
    consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 20 },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.divider,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    checkmark: { color: colors.buttonText, fontWeight: '700' },
    consentText: { flex: 1, fontSize: 14, color: colors.text },
    link: { color: colors.accent, textDecorationLine: 'underline' },
    submit: { marginTop: 18, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', backgroundColor: colors.accent },
    submitDisabled: { opacity: 0.5 },
    submitText: { fontSize: 16, fontWeight: '700', color: colors.buttonText },
  });
