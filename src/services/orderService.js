/**
 * Оформление и заказы (/api/v1/checkout/, /api/v1/orders/) — только после входа:
 * apiService сам шлёт JWT. Состав заказа сервер берёт из корзины пользователя,
 * суммы и скидки считает сам — приложение присылает только контакты и выбор способов.
 */
import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';

/**
 * UUID v4 для client_order_id: повтор отправки (обрыв сети, двойное нажатие) не создаёт
 * второй заказ. Не секрет — сервер проверяет уникальность в паре с пользователем.
 */
export const newClientOrderId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r % 4) + 8).toString(16);
  });

export const DELIVERY_LABELS = { pickup: 'Самовывоз', delivery: 'Доставка', cafe: 'В зале' };
export const PAYMENT_LABELS = { cash: 'Наличные', card: 'Карта', noname: 'Безналичный расчёт', split: 'Раздельная оплата' };
/** Статусы, после которых заказ уже не меняется — опрашивать сервер незачем. */
export const FINAL_STATUSES = ['completed', 'canceled'];

class OrderService {
  getCheckoutOptions() {
    return apiService.get(API_ENDPOINTS.CHECKOUT.OPTIONS);
  }

  quote(deliveryType) {
    return apiService.post(API_ENDPOINTS.CHECKOUT.QUOTE, { delivery_type: deliveryType });
  }

  /** payload: { client_order_id, delivery_type, payment_method, customer_name, phone, address, comment, consent } */
  createOrder(payload) {
    return apiService.post(API_ENDPOINTS.ORDERS.LIST, payload);
  }

  getOrders() {
    return apiService.get(API_ENDPOINTS.ORDERS.LIST);
  }

  getOrder(id) {
    return apiService.get(API_ENDPOINTS.ORDERS.DETAIL(id));
  }

  getMe() {
    return apiService.get(API_ENDPOINTS.ME);
  }
}

export default new OrderService();
