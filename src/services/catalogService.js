/**
 * CatalogService — клиент РЕАЛЬНОГО контракта бэкенда.
 *
 * Переписан 01.11.2026 по коду сайта (Xumpocmb/SoloPizza, приложение app_api):
 *   GET /api/v1/meta/                          → { currency, timezone, default_branch_id, languages }
 *   GET /api/v1/branches/                      → [{ id, name, address, phones[] }]
 *   GET /api/v1/categories/?branch_id=N        → [{ id, slug, name, image, product_count }]
 *   GET /api/v1/categories/<slug>/?branch_id=N → категория + products[]
 *   GET /api/v1/products/?branch_id=N&category=<slug>
 *                                              → [{ id, slug, name, description, image,
 *                                                   min_price, is_weekly_special, is_spicy,
 *                                                   is_sweet, is_combo }]
 *   GET /api/v1/products/<slug>/?branch_id=N   → товар + variants[]/sauces[]/drinks[]
 *
 * Важные факты контракта (app_api/views.py, filters.py, serializers.py):
 *  - branch_id — ОБЯЗАТЕЛЬНЫЙ query-параметр всех эндпоинтов, кроме meta/branches;
 *  - пагинации нет: ListAPIView отдаёт plain-массив (в settings нет pagination);
 *  - алкоголь и неактивные позиции отфильтрованы НА СЕРВЕРЕ;
 *  - отдельных эндпоинтов для размеров/соусов/бортов/добавок НЕТ —
 *    они вложены в карточку товара (variants[].boards / variants[].addons / sauces / drinks);
 *  - серверного поиска НЕТ — поиск фильтруется на клиенте по загруженному списку.
 *
 * UI-совместимость: экраны исторически читают `product.price`, а контракт даёт
 * `min_price`. Нормализация в одном месте — uiProduct(): добавляет price-алиас,
 * не удаля контрактные поля. Убрать алиас можно вместе с рефакторингом экранов.
 *
 * 02.11.2026, дефект №2 из памяти агента: экраны монтируются повторно при
 * навигации (Home → Catalog → Home), и каждый монтаж тянул meta/categories/
 * products заново: 9 запросов вместо 4 на простой сценарий. Добавлены:
 *  - in-flight дедупликация: одновременные вызовы с одним ключом разделяют ОДИН
 *    запрос (закрывает /meta/ ×4 при параллельном бутстрапе);
 *  - тёплый кэш на CACHE_TTL_MS для meta/branches/categories/полного списка
 *    товаров (закрывает повторные /categories/ и /products/ при навигации);
 *  - force=true — обход кэша для pull-to-refresh;
 *  - демо-ответы НЕ кэшируются: как только сервер оживает, следующий запрос
 *    обязан уйти в сеть, а не отдать прошлогоднее демо.
 * Фильтрованные запросы (category/search) кэш не используют: список под фильтр
 * всегда свежий.
 */

import apiService from './apiService';
import { API_ENDPOINTS, USE_DEMO_FALLBACK } from '../config/api';
import { resolveDemo } from './demoCatalog';

/** Время жизни тёплого кэша каталога: меню меняется редко, навигация — часто. */
const CACHE_TTL_MS = 60000;

function uiProduct(product) {
  if (!product || typeof product !== 'object') return product;
  return {
    ...product,
    price: product.min_price ?? product.price ?? null,
  };
}

class CatalogService {
  constructor() {
    this.branchId = null;
    this._demo = false;
    this._categoriesCache = null;
    this._productsCache = null;
    this._cacheBranchId = null;
    this._cache = new Map();
    this._inflight = new Map();
  }

  /** true, если данные сейчас из демо-набора (API недоступен). */
  isDemoActive() {
    return this._demo;
  }

  getBranchId() {
    return this.branchId;
  }

  setBranchId(branchId) {
    if (this.branchId !== branchId) {
      this.branchId = branchId;
      // категории и товары филиалозависимы: кэш сбрасывается целиком
      this.invalidate();
    }
  }

  /** Полный сброс тёплого кэша (смена филиала, pull-to-refresh через force). */
  invalidate() {
    this._cache.clear();
    this._inflight.clear();
    this._categoriesCache = null;
    this._productsCache = null;
    this._cacheBranchId = null;
  }

  _cacheRead(key) {
    const entry = this._cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.at > CACHE_TTL_MS) {
      this._cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * In-flight дедупликация + тёплый кэш.
   * @param {string} key
   * @param {() => Promise<any>} producer
   * @param {{force?: boolean}} [opts]
   */
  async _cached(key, producer, opts = {}) {
    if (!opts.force) {
      const hit = this._cacheRead(key);
      if (hit !== undefined) return hit;
      const inflight = this._inflight.get(key);
      if (inflight) return inflight;
    }
    const promise = producer().then(
      (value) => {
        this._inflight.delete(key);
        if (!this._demo) this._cache.set(key, { at: Date.now(), value });
        return value;
      },
      (error) => {
        this._inflight.delete(key);
        throw error;
      },
    );
    this._inflight.set(key, promise);
    return promise;
  }

  /**
   * Единая точка запроса: при сетевой ошибке/404 и включённом USE_DEMO_FALLBACK
   * отдаёт демо-данные той же формы и помечает сервис демо-режимом.
   */
  async _request(path, params = {}, slugParam = null) {
    try {
      // 5 секунд вместо общих 10: демо-режим включается быстрее,
      // silent: ожидаемые сбои не светят красными тостами
      const response = await apiService.get(path, params, {
        timeout: 5000,
        silent: USE_DEMO_FALLBACK,
      });
      // успех сбрасывает демо-флаг: плашка исчезает без перезапуска
      this._demo = false;
      return response;
    } catch (error) {
      if (!USE_DEMO_FALLBACK) throw error;
      this._demo = true;
      const demo = resolveDemo(path, params, slugParam);
      if (demo === null) throw error;
      return demo;
    }
  }

  async getMeta(options) {
    return this._cached('meta', () => this._request(API_ENDPOINTS.CATALOG.META), options);
  }

  async getBranches(options) {
    return this._cached('branches', () => this._request(API_ENDPOINTS.CATALOG.BRANCHES), options);
  }

  /** branch_id из meta.default_branch_id; дёшево, кэшируется и дедуплицируется. */
  async ensureBranchId(options) {
    if (this.branchId !== null) return this.branchId;
    const meta = await this.getMeta(options);
    this.branchId = meta?.default_branch_id ?? null;
    return this.branchId;
  }

  async getCategories(options) {
    const branchId = await this.ensureBranchId(options);
    const categories = await this._cached(
      `categories:${branchId}`,
      () => this._request(API_ENDPOINTS.CATALOG.CATEGORIES, { branch_id: branchId }),
      options,
    );
    this._categoriesCache = Array.isArray(categories) ? categories : [];
    return this._categoriesCache;
  }

  async getCategoryDetail(slug) {
    const branchId = await this.ensureBranchId();
    const detail = await this._request(
      API_ENDPOINTS.CATALOG.CATEGORY_DETAIL(slug),
      { branch_id: branchId },
      slug,
    );
    if (detail && Array.isArray(detail.products)) {
      return { ...detail, products: detail.products.map(uiProduct) };
    }
    return detail;
  }

  /** category в фильтрах принимается и как slug, и как id (экраны шлют id). */
  async getProducts(filters = {}) {
    const { category, search, force } = filters || {};
    const branchId = await this.ensureBranchId({ force });
    const params = { branch_id: branchId };

    const hasCategory = category !== undefined && category !== null && category !== '';
    const hasSearch = search !== undefined && search !== null && search !== '';

    if (hasCategory) {
      // id категории приходим с экрана; slug берём из кэша категорий,
      // а если кэш ещё холодный — сначала тянем категории (иначе сервер
      // получит число вместо slug и вернёт пустой список)
      if (!this._categoriesCache) {
        await this.getCategories({ force });
      }
      params.category = this._categorySlug(category);
    }

    // Серверного поиска нет: список тянем с серверным фильтром категории,
    // а строку поиска фильтруем локально по name/description.
    const cacheable = !hasCategory && !hasSearch;
    const products = cacheable
      ? await this._cached(
          `products:${branchId}`,
          () => this._request(API_ENDPOINTS.CATALOG.PRODUCTS, params),
          { force },
        )
      : await this._request(API_ENDPOINTS.CATALOG.PRODUCTS, params);

    let items = Array.isArray(products) ? products : [];
    if (hasSearch) {
      const q = String(search).toLowerCase();
      items = items.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q),
      );
    }

    // полный список держим для маппинга id→slug в карточке товара;
    // фильтрованные выдачи его не перетирают
    if (cacheable) {
      this._productsCache = items;
      this._cacheBranchId = branchId;
    }
    return items.map(uiProduct);
  }

  async getProductsByCategory(category, filters = {}) {
    return this.getProducts({ ...filters, category });
  }

  async getProductDetail(idOrSlug) {
    const branchId = await this.ensureBranchId();
    const slug = await this._productSlug(idOrSlug);
    const detail = await this._request(
      API_ENDPOINTS.CATALOG.PRODUCT_DETAIL(slug),
      { branch_id: branchId },
      slug,
    );
    return uiProduct(detail);
  }

  /** Варианты товара (размер/объём + цена + борты + добавки). */
  async getProductVariants(idOrSlug) {
    const detail = await this.getProductDetail(idOrSlug);
    return detail?.variants ?? [];
  }

  /** Размеры товара = его варианты (отдельного эндпоинта размеров в app_api нет). */
  async getPizzaSizes(idOrSlug) {
    return this.getProductVariants(idOrSlug);
  }

  /** Добавки товара: объединение addons по всем вариантам, без дублей по id. */
  async getPizzaAddons(idOrSlug) {
    const variants = await this.getProductVariants(idOrSlug);
    const byId = new Map();
    variants.forEach((variant) => {
      (variant.addons || []).forEach((addon) => byId.set(addon.id, addon));
    });
    return Array.from(byId.values());
  }

  /** Борты товара: объединение boards по всем вариантам, без дублей по id. */
  async getPizzaBoards(idOrSlug) {
    const variants = await this.getProductVariants(idOrSlug);
    const byId = new Map();
    variants.forEach((variant) => {
      (variant.boards || []).forEach((board) => byId.set(board.id, board));
    });
    return Array.from(byId.values());
  }

  /** Соусы основы товара (вложены в карточку, отдельного эндпоинта нет). */
  async getPizzaSauces(idOrSlug) {
    const detail = await this.getProductDetail(idOrSlug);
    return detail?.sauces ?? [];
  }

  /** Напитки комбо (вложены в карточку). */
  async getComboDrinks(idOrSlug) {
    const detail = await this.getProductDetail(idOrSlug);
    return detail?.drinks ?? [];
  }

  /**
   * «Популярное» для главного экрана: серверного ordering по популярности нет,
   * контракт даёт флаг акции is_weekly_special — он и есть витрина.
   */
  async getPopularProducts(params = {}) {
    const { limit = 6, force } = params || {};
    const products = await this.getFeaturedProducts({ force });
    return products.slice(0, limit);
  }

  async getFeaturedProducts(options) {
    // v1.1 (вечер 02.11.2026): новинки выбирает СЕРВЕР (/products/featured/).
    // Если эндпоинт недоступен (старый деплой, offline) — прежняя локальная
    // выборка: акции is_weekly_special, иначе весь список.
    const branchId = await this.ensureBranchId({ force: options?.force });
    try {
      const featured = await this._cached(
        `featured:${branchId}`,
        () => this._request(API_ENDPOINTS.CATALOG.FEATURED, { branch_id: branchId }),
        options,
      );
      const items = Array.isArray(featured) ? featured : [];
      if (items.length > 0) return items.map(uiProduct);
    } catch (error) {
      // сервер без featured: уходим в локальную выборку ниже
    }
    const products = await this.getProducts({ force: options?.force });
    const weekly = products.filter((p) => p.is_weekly_special);
    return weekly.length > 0 ? weekly : products;
  }

  /**
   * «Пицца недели» (v1.1): ВСЕГДА один объект — полная карточка с variants.
   * null — когда акции нет или эндпоинт недоступен: блок просто скрывается.
   */
  async getWeeklySpecial(options) {
    const branchId = await this.ensureBranchId({ force: options?.force });
    try {
      const detail = await this._cached(
        `weekly:${branchId}`,
        () => this._request(API_ENDPOINTS.CATALOG.WEEKLY_SPECIAL, { branch_id: branchId }),
        options,
      );
      return detail && typeof detail === 'object' ? uiProduct(detail) : null;
    } catch (error) {
      return null;
    }
  }

  async searchProducts(query, filters = {}) {
    return this.getProducts({ ...filters, search: query });
  }

  // ── внутренние хелперы ────────────────────────────────────────

  _categorySlug(category) {
    if (typeof category === 'string' && Number.isNaN(Number(category))) return category;
    const found = (this._categoriesCache || []).find(
      (c) => String(c.id) === String(category),
    );
    return found ? found.slug : String(category);
  }

  async _productSlug(idOrSlug) {
    if (typeof idOrSlug === 'string' && Number.isNaN(Number(idOrSlug))) return idOrSlug;
    if (this._cacheBranchId !== this.branchId || !this._productsCache) {
      await this.getProducts();
    }
    const found = (this._productsCache || []).find((p) => String(p.id) === String(idOrSlug));
    return found ? found.slug : String(idOrSlug);
  }
}

export default new CatalogService();
