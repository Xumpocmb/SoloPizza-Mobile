/**
 * SMOKE-ТЕСТ
 * СОЗДАН ПРИ АУДИТЕ 31.10.2026 (вместо удалённого шаблонного App.test.tsx,
 * который рендерил несуществующий дефолтный App).
 *
 * Задача — доказать, что приложение СОБИРАЕТСЯ как граф модулей:
 * store создаётся, все сервисы экспортируются, навигатор строится,
 * экраны импортируются без падения.
 *
 * Это НЕ тест бизнес-логики и НЕ тест с реальным API
 * (бэкенд на solo-pizza.by отсутствует — см. отчёт об аудите).
 */

describe('Redux store', () => {
  it('создаётся и содержит все 5 веток состояния', () => {
    const { store } = require('../src/store/store');
    const state = store.getState();
    expect(Object.keys(state).sort()).toEqual(
      ['auth', 'cart', 'catalog', 'order', 'products'],
    );
  });

  it('ветка products имеет форму, которую ждут экраны', () => {
    const { store } = require('../src/store/store');
    const p = store.getState().products;
    // HomeScreen:      const { featuredProducts, categories, loading } = state.products
    // CatalogScreen:   const { products, categories, loading, error } = state.products
    // ProductDetail:   const { currentProduct, loading } = state.products
    ['products', 'featuredProducts', 'categories', 'currentProduct', 'loading', 'error']
      .forEach(key => expect(p).toHaveProperty(key));
  });
});

describe('Сервисы', () => {
  it('index.js экспортирует все 8 сервисов (раньше не хватало трёх)', () => {
    const services = require('../src/services');
    ['apiService', 'authService', 'catalogService', 'cartService', 'orderService',
     'productService', 'promoService', 'userService']
      .forEach(name => {
        expect(services[name]).toBeDefined();
      });
  });

  it('у authService есть методы, которые вызывает LoginScreen', () => {
    const { authService } = require('../src/services');
    ['login', 'register', 'logout', 'resetPassword', 'storeTokens', 'storeUserData']
      .forEach(m => expect(typeof authService[m]).toBe('function'));
  });

  it('у productService есть методы, которые вызывают экраны', () => {
    const { productService } = require('../src/services');
    ['getProducts', 'getPopularProducts', 'getProductDetail',
     'getProductSizes', 'getProductToppings']
      .forEach(m => expect(typeof productService[m]).toBe('function'));
  });

  it('у userService есть методы для Checkout и Profile', () => {
    const { userService } = require('../src/services');
    ['getProfile', 'getAddresses', 'getStats']
      .forEach(m => expect(typeof userService[m]).toBe('function'));
  });

  it('нет ни одного undefined-эндпоинта в API_ENDPOINTS (было 20)', () => {
    const { API_ENDPOINTS } = require('../src/config/api');
    const used = [
      ['ORDERS', 'CREATE'], ['ORDERS', 'LIST'], ['ORDERS', 'PAYMENT'],
      ['ORDERS', 'DELIVERY_COST'], ['ORDERS', 'TRACK'], ['ORDERS', 'RECEIPT'],
      ['CART', 'ADD'], ['CART', 'UPDATE'], ['CART', 'REMOVE'], ['CART', 'CLEAR'],
      ['CART', 'PROMO'], ['PROMO', 'ACTIVE'], ['USER', 'ADDRESSES'], ['USER', 'STATS'],
    ];
    used.forEach(([g, k]) => {
      expect(API_ENDPOINTS[g]).toBeDefined();
      expect(API_ENDPOINTS[g][k]).toBeDefined();
    });
  });
});

describe('Thunks', () => {
  it('productSlice экспортирует то, что диспатчат экраны', () => {
    const slice = require('../src/store/slices/productSlice');
    ['fetchProducts', 'fetchCategories', 'fetchFeaturedProducts', 'fetchProductById']
      .forEach(t => expect(typeof slice[t]).toBe('function'));
  });

  it('authSlice экспортирует updateProfile (раньше его не было)', () => {
    const slice = require('../src/store/slices/authSlice');
    ['loginUser', 'registerUser', 'logout', 'logoutUser', 'updateProfile',
     'loadStoredTokens', 'clearError']
      .forEach(t => expect(slice[t]).toBeDefined());
  });
});

describe('Навигация', () => {
  it('AppNavigator импортируется без падения (все 10 экранов резолвятся)', () => {
    const AppNavigator = require('../src/navigation/AppNavigator').default;
    expect(typeof AppNavigator).toBe('function');
  });
});

describe('App', () => {
  it('App.tsx больше не шаблон и подключает Provider', () => {
    const App = require('../App').default;
    expect(typeof App).toBe('function');
    const src = require('fs').readFileSync(require('path').join(__dirname, '../App.tsx'), 'utf8');
    expect(src).toContain('Provider');
    expect(src).toContain('AppNavigator');
    // Проверяем именно ИМПОРТ шаблонного экрана, а не упоминание в комментарии
    expect(src).not.toMatch(/^\s*import[^\n]*new-app-screen/m);
    expect(src).not.toMatch(/<NewAppScreen/);
  });
});
