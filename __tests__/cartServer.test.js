import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';
import cartReducer, {
  addToCart,
  loadCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
} from '../src/store/slices/cartSlice';
import productsReducer, { selectBranch, restoreBranch } from '../src/store/slices/productSlice';
import catalogService from '../src/services/catalogService';

/**
 * Поддельный /api/v1/cart/ с поведением сервера (Xumpocmb/SoloPizza#1): корзина по
 * X-Cart-Token, цены считает «сервер», смена филиала очищает корзину.
 */
function fakeCartServer() {
  const carts = new Map();
  const calls = [];
  let nextLine = 1;
  const reply = (status, data) => ({
    status,
    ok: status < 400,
    statusText: '',
    headers: { get: () => 'application/json' },
    json: async () => data,
  });
  const view = (cart) => ({
    ...cart,
    items_count: cart.items.reduce((n, l) => n + l.quantity, 0),
    subtotal: cart.items.reduce((s, l) => s + l.quantity * 26.5, 0).toFixed(2),
    items: cart.items.map((l) => ({ ...l, unit_price: '26.50', total: (l.quantity * 26.5).toFixed(2) })),
  });
  global.fetch = jest.fn(async (url, options) => {
    const path = url.replace(/^.*\/api\/v1/, '');
    const body = options.body ? JSON.parse(options.body) : null;
    const cart = carts.get(options.headers['X-Cart-Token']);
    calls.push(`${options.method} ${path}`);
    if (options.method === 'POST' && path === '/cart/') {
      const token = `t${carts.size + 1}`;
      carts.set(token, { token, branch_id: body.branch_id, items: [] });
      return reply(201, view(carts.get(token)));
    }
    if (!cart) return reply(404, { detail: 'Корзина не найдена' });
    if (options.method === 'GET') return reply(200, view(cart));
    if (options.method === 'POST' && path === '/cart/items/') {
      if (body.product_id === 999) return reply(400, { product_id: ['Товар недоступен в выбранном филиале'] });
      cart.items.push({
        id: nextLine++, product_id: body.product_id, name: 'Ассорти', image: null, quantity: body.quantity,
        variant: { id: body.variant_id, size: '32', value: null, unit: 'см' },
        board1: null, board2: null, sauce: { id: 3, name: 'Итальянский' },
        addons: [{ id: 2, name: 'Ветчина (32): 0.90 руб.', price: '0.90' }], drink: null,
      });
      return reply(200, view(cart));
    }
    const lineId = Number(path.split('/')[3]);
    if (options.method === 'PATCH') {
      cart.items.find((l) => l.id === lineId).quantity = body.quantity;
      return reply(200, view(cart));
    }
    if (options.method === 'DELETE') {
      cart.items = cart.items.filter((l) => l.id !== lineId);
      return reply(200, view(cart));
    }
    if (options.method === 'PUT') {
      Object.assign(cart, { branch_id: body.branch_id, items: [] });
      return reply(200, view(cart));
    }
    return reply(500, {});
  });
  return { calls, carts };
}

const pizza = (quantity = 1, product_id = 134) => ({
  product_id, variant_id: 248, board1_id: null, board2_id: null, sauce_id: 3, addon_ids: [2], drink_id: null, quantity,
});

const newStore = () => configureStore({ reducer: { cart: cartReducer, products: productsReducer } });

let server;
let store;
beforeEach(async () => {
  await AsyncStorage.clear();
  catalogService.setBranchId(1);
  server = fakeCartServer();
  store = newStore();
});

test('без корзины ничего не запрашивает', async () => {
  await store.dispatch(loadCart());
  expect(server.calls).toEqual([]);
  expect(store.getState().cart.items).toEqual([]);
});

test('первое добавление создаёт корзину филиала, дальше — та же корзина', async () => {
  await store.dispatch(addToCart(pizza(2)));
  await store.dispatch(addToCart(pizza(1)));
  expect(server.calls.filter((c) => c === 'POST /cart/')).toHaveLength(1);
  expect(server.carts.get('t1').branch_id).toBe(1);
  expect(await AsyncStorage.getItem('cart_token')).toBe('t1');

  const { items, itemsCount, totalAmount } = store.getState().cart;
  expect(itemsCount).toBe(3);
  expect(totalAmount).toBeCloseTo(79.5);
  expect(items[0]).toMatchObject({ name: 'Ассорти', price: 26.5, size: { name: '32 см' } });
  expect(items[0].addons[0].name).toBe('Ветчина'); // без «(32): 0.90 руб.»
});

test('количество, удаление и очистка идут через сервер', async () => {
  await store.dispatch(addToCart(pizza()));
  const id = store.getState().cart.items[0].id;
  await store.dispatch(updateCartItemQuantity({ itemId: id, quantity: 4 }));
  expect(store.getState().cart.itemsCount).toBe(4);
  await store.dispatch(updateCartItemQuantity({ itemId: id, quantity: 0 }));
  expect(store.getState().cart.items).toEqual([]);

  await store.dispatch(addToCart(pizza()));
  await store.dispatch(removeFromCart({ itemId: store.getState().cart.items[0].id }));
  await store.dispatch(addToCart(pizza()));
  await store.dispatch(clearCart());
  expect(store.getState().cart.items).toEqual([]);
});

test('ошибка сервера доходит до экрана текстом', async () => {
  const result = await store.dispatch(addToCart(pizza(1, 999)));
  expect(result.payload).toBe('Товар недоступен в выбранном филиале');
  expect(store.getState().cart.error).toBe('Товар недоступен в выбранном филиале');
});

test('корзину удалили на сервере — при загрузке пусто, при добавлении новая', async () => {
  await store.dispatch(addToCart(pizza()));
  server.carts.clear();
  await store.dispatch(loadCart());
  expect(store.getState().cart.items).toEqual([]);
  await store.dispatch(addToCart(pizza()));
  expect(store.getState().cart.itemsCount).toBe(1);
});

test('смена филиала очищает корзину на сервере и запоминается', async () => {
  await store.dispatch(addToCart(pizza()));
  await store.dispatch(selectBranch(1));
  expect(store.getState().cart.itemsCount).toBe(1); // тот же филиал — без изменений

  await store.dispatch(selectBranch(2));
  expect(server.calls).toContain('PUT /cart/branch/');
  expect(server.carts.get('t1').branch_id).toBe(2);
  expect(store.getState().cart.items).toEqual([]);
  expect(await AsyncStorage.getItem('branch_id')).toBe('2');

  catalogService.setBranchId(null);
  await store.dispatch(restoreBranch());
  expect(catalogService.getBranchId()).toBe(2);
});
