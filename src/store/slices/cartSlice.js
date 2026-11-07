// Корзина: полностью локальная (redux + AsyncStorage).
// В app_api друга эндпоинтов корзины пока нет — никаких серверных вызовов,
// иначе 404 и красные тосты LogBox. Когда появится quote_cart/order,
// серверная синхронизация вернётся отдельным слоем.
//
// ВАЖНО: старый slice ожидал {productId, options} и выбрасывал name/price/image,
// из-за чего в корзине лежали позиции без цены → краш toFixed. Теперь slice
// принимает ГОТОВУЮ позицию {id, name, price, image, quantity, size?, toppings?}
// и хранит её как есть (price нормализуется в число через num()).
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { num } from '../../utils/money';

const CART_STORAGE_KEY = 'cart_items';

const readItems = async () => {
  try {
    const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
};

const writeItems = async (items) => {
  try {
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // персист не критичен: состояние в redux уже обновлено
  }
};

// Гидрация при старте приложения (иначе после перезапуска корзина пуста,
// пока пользователь что-нибудь не добавит).
export const loadCart = createAsyncThunk('cart/loadCart', async () => readItems());

// Старое имя — оставляем алиасом, чтобы ничего не отвалилось.
export const fetchCart = loadCart;

export const addToCart = createAsyncThunk('cart/addToCart', async (item = {}) => {
  const items = await readItems();
  const incoming = {
    ...item,
    id: item.id ?? item.productId ?? `item_${Date.now()}`,
    productId: item.productId ?? item.id,
    price: num(item.price),
    quantity: num(item.quantity) || 1,
  };
  const idx = items.findIndex((i) => String(i.id) === String(incoming.id));
  let next;
  if (idx >= 0) {
    next = items.map((i, n) =>
      n === idx ? { ...i, ...incoming, quantity: num(i.quantity) + incoming.quantity } : i,
    );
  } else {
    next = [...items, incoming];
  }
  await writeItems(next);
  return next;
});

export const removeFromCart = createAsyncThunk('cart/removeFromCart', async (arg) => {
  // Совместимость: вызывают и removeFromCart(id), и removeFromCart({itemId})
  const id = arg && typeof arg === 'object' ? arg.itemId : arg;
  const items = (await readItems()).filter((i) => String(i.id) !== String(id));
  await writeItems(items);
  return items;
});

export const updateCartItemQuantity = createAsyncThunk(
  'cart/updateCartItemQuantity',
  async ({ itemId, quantity }) => {
    const current = await readItems();
    const qty = num(quantity);
    const items =
      qty <= 0
        ? current.filter((i) => String(i.id) !== String(itemId))
        : current.map((i) => (String(i.id) === String(itemId) ? { ...i, quantity: qty } : i));
    await writeItems(items);
    return items;
  },
);

export const clearCart = createAsyncThunk('cart/clearCart', async () => {
  await AsyncStorage.removeItem(CART_STORAGE_KEY);
  return [];
});

const initialState = {
  items: [],
  total: 0,
  totalAmount: 0,
  itemsCount: 0,
  isLoading: false,
  error: null,
};

// Единый пересчёт итогов: цены с сервера приходят строками ("12.50") — num().
const applyItems = (state, items) => {
  state.items = items;
  state.totalAmount = items.reduce((s, i) => s + num(i.price) * num(i.quantity), 0);
  state.total = state.totalAmount;
  state.itemsCount = items.reduce((s, i) => s + num(i.quantity), 0);
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCart.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadCart.fulfilled, (state, action) => {
        state.isLoading = false;
        applyItems(state, action.payload || []);
      })
      .addCase(loadCart.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        applyItems(state, action.payload || []);
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        applyItems(state, action.payload || []);
      })
      .addCase(updateCartItemQuantity.fulfilled, (state, action) => {
        applyItems(state, action.payload || []);
      })
      .addCase(clearCart.fulfilled, (state) => {
        applyItems(state, []);
      });
    // rejected-ветки намеренно тихие: корзина локальная, падать нечему,
    // а красные тосты LogBox уже стоили нам нервов.
  },
});

export const { clearError } = cartSlice.actions;
export default cartSlice.reducer;
