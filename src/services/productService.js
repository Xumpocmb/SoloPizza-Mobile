/**
 * Product service
 *
 * СОЗДАН ПРИ АУДИТЕ 31.10.2026.
 *
 * Зачем: HomeScreen, CatalogScreen и ProductDetailScreen импортировали
 * `productService` из '../services', но он не существовал и не экспортировался
 * → обращение к методу давало "Cannot read property of undefined".
 *
 * Решение: этот сервис — ТОНКАЯ ОБЁРТКА над уже существующим catalogService.
 * Все нужные методы там были (getProducts, getPopularProducts, getProductDetail,
 * getPizzaSizes, getPizzaAddons). Дублировать логику запросов нельзя — иначе
 * получим третий параллельный API-слой, которых в проекте и так два.
 *
 * Экраны постепенно стоит перевести на прямой вызов catalogService,
 * после чего этот файл можно удалить.
 */

import catalogService from './catalogService';

const productService = {
  /**
   * Список товаров.
   * @param {{category?: number, search?: string, page?: number, limit?: number, sort?: string}} [params]
   */
  async getProducts(params = {}) {
    return catalogService.getProducts(params);
  },

  /** Товары конкретной категории. */
  async getProductsByCategory(categoryId, params = {}) {
    return catalogService.getProductsByCategory(categoryId, params);
  },

  /**
   * Популярные товары для главного экрана.
   * HomeScreen вызывает: getPopularProducts({ limit: 6 })
   */
  async getPopularProducts(params = {}) {
    return catalogService.getPopularProducts(params);
  },

  /** Товары для блока «Рекомендуем» / акций. */
  async getFeaturedProducts(params = {}) {
    return catalogService.getFeaturedProducts(params);
  },

  /**
   * Карточка товара.
   * ProductDetailScreen вызывает: getProductDetail(productId)
   */
  async getProductDetail(productId) {
    return catalogService.getProductDetail(productId);
  },

  /**
   * Доступные размеры товара.
   * ProductDetailScreen вызывает: getProductSizes(productData.id)
   */
  async getProductSizes(productId) {
    return catalogService.getPizzaSizes({ product: productId });
  },

  /**
   * Доступные топпинги / добавки.
   * ProductDetailScreen вызывает: getProductToppings(productData.id)
   */
  async getProductToppings(productId) {
    return catalogService.getPizzaAddons({ product: productId });
  },

  /** Варианты товара (размер + тесто + цена). */
  async getProductVariants(productId) {
    return catalogService.getProductVariants({ product: productId });
  },

  /** Поиск по каталогу. */
  async searchProducts(query, params = {}) {
    return catalogService.searchProducts(query, params);
  },

  /** Метаданные API: валюта, таймзона, филиал по умолчанию (app_api /meta/). */
  async getMeta() {
    return catalogService.getMeta();
  },

  /** Список филиалов (app_api /branches/). */
  async getBranches() {
    return catalogService.getBranches();
  },

  /** Категория вместе с товарами (app_api /categories/<slug>/). */
  async getCategoryDetail(slug) {
    return catalogService.getCategoryDetail(slug);
  },

  /** Борты пиццы товара (вложены в варианты карточки). */
  async getProductBoards(productId) {
    return catalogService.getPizzaBoards(productId);
  },

  /** Соусы основы товара (вложены в карточку). */
  async getProductSauces(productId) {
    return catalogService.getPizzaSauces(productId);
  },

  /** Напитки комбо (вложены в карточку). */
  async getComboDrinks(productId) {
    return catalogService.getComboDrinks(productId);
  },
};

export default productService;
