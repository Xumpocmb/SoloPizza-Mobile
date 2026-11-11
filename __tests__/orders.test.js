import AsyncStorage from '@react-native-async-storage/async-storage';
import orderService, { newClientOrderId, FINAL_STATUSES } from '../src/services/orderService';
import { apiErrorMessage, apiFieldErrors } from '../src/utils/apiError';

const UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('client_order_id — UUID v4, каждый раз новый', () => {
  const ids = Array.from({ length: 200 }, newClientOrderId);
  ids.forEach((id) => expect(id).toMatch(UUID4));
  expect(new Set(ids).size).toBe(200);
});

test('ошибки DRF: поля для подсветки и одна строка для пользователя', () => {
  const fieldError = { status: 400, data: { address: ['Укажите адрес для доставки'], phone: 'Проверьте номер' } };
  expect(apiFieldErrors(fieldError)).toEqual({ address: 'Укажите адрес для доставки', phone: 'Проверьте номер' });
  expect(apiErrorMessage(fieldError)).toBe('Укажите адрес для доставки');

  const closed = { status: 400, data: { detail: ['Заказы временно не принимаются: филиал «Тексер» сегодня не работает.'] } };
  expect(apiErrorMessage(closed)).toBe('Заказы временно не принимаются: филиал «Тексер» сегодня не работает.');

  expect(apiFieldErrors({ status: 0, message: 'Проблемы с подключением к интернету' })).toBeNull();
  expect(apiErrorMessage({ status: 0, message: 'Проблемы с подключением к интернету' })).toBe('Проблемы с подключением к интернету');
  expect(apiErrorMessage(undefined, 'запасной')).toBe('запасной');
});

describe('orderService ходит в настоящие эндпоинты с токеном входа', () => {
  let calls;
  beforeEach(async () => {
    calls = [];
    await AsyncStorage.clear();
    await AsyncStorage.setItem('access_token', 'jwt-access');
    global.fetch = jest.fn(async (url, options) => {
      calls.push({
        method: options.method,
        path: url.replace(/^.*\/api\/v1/, ''),
        auth: options.headers.Authorization,
        body: options.body ? JSON.parse(options.body) : null,
      });
      return { status: 200, ok: true, statusText: '', headers: { get: () => 'application/json' }, json: async () => ({ id: 7 }) };
    });
  });

  test('оформление, итог, заказы', async () => {
    const payload = {
      client_order_id: newClientOrderId(), delivery_type: 'pickup', payment_method: 'cash',
      customer_name: 'ТЕСТ', phone: '+375291112233', address: '', comment: '', consent: true,
    };
    await orderService.getCheckoutOptions();
    await orderService.quote('delivery');
    await orderService.createOrder(payload);
    await orderService.getOrders();
    await orderService.getOrder(7);
    await orderService.getMe();

    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'GET /checkout/options/',
      'POST /checkout/quote/',
      'POST /orders/',
      'GET /orders/',
      'GET /orders/7/',
      'GET /me/',
    ]);
    calls.forEach((c) => expect(c.auth).toBe('Bearer jwt-access'));
    expect(calls[1].body).toEqual({ delivery_type: 'delivery' });
    expect(calls[2].body).toEqual(payload); // ни цен, ни состава — их знает сервер
  });
});

test('опрос статуса останавливается на завершённом и отменённом', () => {
  expect(FINAL_STATUSES).toEqual(['completed', 'canceled']);
});
