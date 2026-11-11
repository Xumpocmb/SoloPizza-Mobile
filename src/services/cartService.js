/**
 * Корзина на сервере (/api/v1/cart/). Приложение хранит только токен гостевой
 * корзины; состав, цены и проверки опций — на сервере. После входа apiService
 * сам шлёт JWT, и сервер отдаёт корзину пользователя.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './apiService';
import catalogService from './catalogService';
import { API_ENDPOINTS } from '../config/api';

const TOKEN_KEY = 'cart_token';
export const EMPTY_CART = { branch_id: null, items: [], items_count: 0, subtotal: '0.00' };

class CartService {
  async request(method, path, data, options = {}) {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return apiService.makeRequest(path, {
      method,
      body: data === undefined ? undefined : JSON.stringify(data),
      headers: token ? { 'X-Cart-Token': token } : {},
      ...options,
    });
  }

  /** Текущая корзина или null, если её ещё нет (или сервер её больше не знает). */
  async get() {
    const [token, auth] = await Promise.all([AsyncStorage.getItem(TOKEN_KEY), apiService.getAuthToken()]);
    if (!token && !auth) return null;
    try {
      return await this.request('GET', API_ENDPOINTS.CART.ROOT, undefined, { silent: true });
    } catch (error) {
      if (error?.status === 404) {
        await AsyncStorage.removeItem(TOKEN_KEY);
        return null;
      }
      throw error;
    }
  }

  /** Корзина для текущего филиала: существующая или новая. */
  async ensure() {
    const branchId = await catalogService.ensureBranchId();
    const cart = await this.get();
    if (cart) {
      // корзина могла остаться от другого филиала (выбор на другом устройстве) — меню у филиалов разное
      return cart.branch_id === branchId ? cart : this.changeBranch(branchId);
    }
    const created = await this.request('POST', API_ENDPOINTS.CART.ROOT, { branch_id: branchId });
    await AsyncStorage.setItem(TOKEN_KEY, created.token);
    return created;
  }

  /** payload: { product_id, variant_id, board1_id, board2_id, sauce_id, addon_ids, drink_id, quantity } */
  async addItem(payload) {
    await this.ensure();
    try {
      return await this.request('POST', API_ENDPOINTS.CART.ITEMS, payload);
    } catch (error) {
      if (error?.status !== 404) throw error;
      // корзину удалили на сервере между ensure и добавлением — заводим новую один раз
      await AsyncStorage.removeItem(TOKEN_KEY);
      await this.ensure();
      return this.request('POST', API_ENDPOINTS.CART.ITEMS, payload);
    }
  }

  async setQuantity(itemId, quantity) {
    return this.request('PATCH', API_ENDPOINTS.CART.ITEM(itemId), { quantity });
  }

  async removeItem(itemId) {
    return this.request('DELETE', API_ENDPOINTS.CART.ITEM(itemId));
  }

  /** Смена филиала на сервере очищает корзину; корзины ещё нет — менять нечего. */
  async changeBranch(branchId) {
    if (!(await this.get())) return null;
    return this.request('PUT', API_ENDPOINTS.CART.BRANCH, { branch_id: branchId });
  }

  /** Очистить = «сменить» филиал на тот же: сервер удаляет все позиции. */
  async clear() {
    const cart = await this.get();
    return cart ? this.request('PUT', API_ENDPOINTS.CART.BRANCH, { branch_id: cart.branch_id }) : null;
  }
}

export default new CartService();
