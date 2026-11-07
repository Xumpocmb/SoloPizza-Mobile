/**
 * Promo service
 *
 * СОЗДАН ПРИ АУДИТЕ 31.10.2026.
 *
 * Зачем: HomeScreen вызывает `promoService.getActivePromos()` для заполнения
 * баннеров на главном экране, но сервис не существовал → TypeError.
 *
 * ⚠️ НА БЭКЕНДЕ НЕТ ЭНДПОИНТА ДЛЯ АКЦИЙ.
 * В config/api.js добавлен путь PROMO.ACTIVE = '/promo/active/', но на
 * solo-pizza.by сейчас вообще нет REST API. До его появления метод
 * корректно возвращает пустой массив, и HomeScreen остаётся на своих
 * дефолтных баннерах (они захардкожены в useState внутри экрана).
 * Это сделано намеренно: экран не должен падать из-за отсутствующего API.
 */

import apiService from './apiService';
import { API_ENDPOINTS, PROMOS_ENABLED } from '../config/api';

/**
 * Приводит ответ бэкенда к массиву.
 * Ожидается форма: [{ id, title, description, background_color, image }]
 */
function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
}

class PromoService {
  /**
   * Активные акции и промо-баннеры.
   * HomeScreen маппит ответ так:
   *   { id: promo.id, title: promo.title,
   *     subtitle: promo.description || promo.subtitle,
   *     backgroundColor: promo.background_color || '#FF6B35' }
   *
   * @returns {Promise<Array>} никогда не бросает — возвращает [] при ошибке
   */
  async getActivePromos() {
    // 02.11.2026, дефект №3: эндпоинта акций на бэкенде нет, запрос уходил в 404
    // на каждом открытии Home. Пока PROMOS_ENABLED = false — не делаем запрос
    // вовсе и честно отдаём пустой массив; баннеры остаются дефолтными.
    if (!PROMOS_ENABLED) {
      return [];
    }
    try {
      // silent: сбой промо не ошибка приложения, красный тост не нужен
      const response = await apiService.get(API_ENDPOINTS.PROMO.ACTIVE, {}, { silent: true });
      return toArray(response);
    } catch (error) {
      // Эндпоинта может не быть — это не ошибка приложения, а отсутствие данных.
      // Логируем тихо, чтобы не засорять консоль на каждом открытии экрана.
      if (__DEV__) {
        console.warn('[promoService] getActivePromos недоступен:', error?.message || error);
      }
      return [];
    }
  }

  /**
   * Применить промокод (делегирование в cartService, чтобы не дублировать логику).
   * Оставлено здесь для симметрии API — экраны сейчас используют cartService.applyPromoCode.
   */
  async validatePromoCode(code) {
    try {
      return await apiService.post(API_ENDPOINTS.PROMO.VALIDATE, { code });
    } catch (error) {
      throw error;
    }
  }
}

export default new PromoService();
