/**
 * Регрессия краша «Cannot read property 'toFixed' of undefined» (03.11.2026):
 * цены приходят с сервера строками (DecimalField → "12.50"), а старый slice
 * выбрасывал name/price при сохранении. Новый cartSlice обязан:
 *  - принимать готовую позицию и нормализовать price в число;
 *  - сливать дубли по id и пересчитывать totalAmount;
 *  - переживать remove/update/clear и гидрацию из AsyncStorage.
 */
import { configureStore } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import cartReducer, {
  addToCart,
  removeFromCart,
  updateCartItemQuantity,
  clearCart,
  loadCart,
} from '../src/store/slices/cartSlice';
import { num } from '../src/utils/money';

const makeStore = () => configureStore({ reducer: { cart: cartReducer } });
const cart = (store) => store.getState().cart;

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('num() — денежная гигиена', () => {
  it('строка "12.50" → 12.5', () => {
    expect(num('12.50')).toBe(12.5);
  });
  it('undefined / null / мусор → 0 (а не NaN)', () => {
    expect(num(undefined)).toBe(0);
    expect(num(null)).toBe(0);
    expect(num('abc')).toBe(0);
    expect(Number.isFinite(num({}))).toBe(true);
  });
  it('число проходит как есть', () => {
    expect(num(7)).toBe(7);
  });
});

describe('cartSlice — локальная корзина', () => {
  it('строковая цена нормализуется, totalAmount считается числом', async () => {
    const store = makeStore();
    await store.dispatch(addToCart({ id: 1, name: 'Пицца', price: '12.50', quantity: 2, image: null }));
    expect(cart(store).items[0].price).toBe(12.5);
    expect(cart(store).totalAmount).toBeCloseTo(25);
    expect(cart(store).items[0].price.toFixed(2)).toBe('12.50');
  });

  it('повторное добавление той же позиции сливает количество', async () => {
    const store = makeStore();
    await store.dispatch(addToCart({ id: 1, name: 'Пицца', price: '12.50', quantity: 1 }));
    await store.dispatch(addToCart({ id: 1, name: 'Пицца', price: '12.50', quantity: 2 }));
    expect(cart(store).items).toHaveLength(1);
    expect(cart(store).items[0].quantity).toBe(3);
    expect(cart(store).totalAmount).toBeCloseTo(37.5);
  });

  it('позиция без цены (старый персист) не роняет итоги', async () => {
    await AsyncStorage.setItem('cart_items', JSON.stringify([{ id: 'x', name: 'Старая', quantity: 1 }]));
    const store = makeStore();
    await store.dispatch(loadCart());
    expect(cart(store).items).toHaveLength(1);
    expect(cart(store).totalAmount).toBe(0);
    expect(num(cart(store).items[0].price).toFixed(2)).toBe('0.00');
  });

  it('updateCartItemQuantity меняет количество и пересчитывает итоги', async () => {
    const store = makeStore();
    await store.dispatch(addToCart({ id: 1, name: 'Пицца', price: 10, quantity: 1 }));
    await store.dispatch(updateCartItemQuantity({ itemId: 1, quantity: '4' }));
    expect(cart(store).items[0].quantity).toBe(4);
    expect(cart(store).totalAmount).toBeCloseTo(40);
  });

  it('updateCartItemQuantity c 0 удаляет позицию', async () => {
    const store = makeStore();
    await store.dispatch(addToCart({ id: 1, name: 'Пицца', price: 10, quantity: 1 }));
    await store.dispatch(updateCartItemQuantity({ itemId: 1, quantity: 0 }));
    expect(cart(store).items).toHaveLength(0);
  });

  it('removeFromCart принимает и id, и {itemId}', async () => {
    const store = makeStore();
    await store.dispatch(addToCart({ id: 'a', name: 'A', price: 5, quantity: 1 }));
    await store.dispatch(addToCart({ id: 'b', name: 'B', price: 7, quantity: 1 }));
    await store.dispatch(removeFromCart('a'));
    expect(cart(store).items.map((i) => i.id)).toEqual(['b']);
    await store.dispatch(removeFromCart({ itemId: 'b' }));
    expect(cart(store).items).toHaveLength(0);
  });

  it('clearCart обнуляет всё', async () => {
    const store = makeStore();
    await store.dispatch(addToCart({ id: 1, name: 'Пицца', price: 10, quantity: 2 }));
    await store.dispatch(clearCart());
    expect(cart(store).items).toHaveLength(0);
    expect(cart(store).totalAmount).toBe(0);
    expect(cart(store).itemsCount).toBe(0);
  });

  it('корзина переживает перезапуск приложения (персист)', async () => {
    const store1 = makeStore();
    await store1.dispatch(addToCart({ id: 1, name: 'Пицца', price: '12.50', quantity: 2 }));
    // «холодный старт»: новый store, состояние пустое — восстанавливаем из AsyncStorage
    const store2 = makeStore();
    expect(cart(store2).items).toHaveLength(0);
    await store2.dispatch(loadCart());
    expect(cart(store2).items).toHaveLength(1);
    expect(cart(store2).totalAmount).toBeCloseTo(25);
  });
});
