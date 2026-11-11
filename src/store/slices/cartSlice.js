// Корзина на сервере (/api/v1/cart/, см. cartService). Redux хранит последний ответ
// сервера в форме, которую уже понимают экраны: { id, name, image, price, quantity,
// size, sauce, boards, addons, drink }. Цены и итоги — только серверные.
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import cartService, { EMPTY_CART } from '../../services/cartService';
import { num } from '../../utils/money';
import { apiErrorMessage } from '../../utils/apiError';
import { optionLabel, variantLabel } from '../../utils/productOptions';

const option = (item) => (item ? { ...item, name: optionLabel(item.name), price: num(item.price) } : null);

/** Позиция ответа сервера → позиция для экранов. */
export const fromServerLine = (line) => ({
  id: line.id,
  productId: line.product_id,
  name: line.name,
  image: line.image,
  quantity: line.quantity,
  price: num(line.unit_price),
  total: num(line.total),
  size: { id: line.variant.id, name: variantLabel(line.variant) },
  sauce: line.sauce,
  boards: [line.board1, line.board2].filter(Boolean).map(option),
  addons: line.addons.map(option),
  drink: line.drink ? { name: line.drink } : null,
});

const errorMessage = (error) => apiErrorMessage(error, 'Не удалось обновить корзину');

const cartThunk = (type, run) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return (await run(arg)) ?? EMPTY_CART;
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  });

export const loadCart = cartThunk('cart/loadCart', () => cartService.get());
export const fetchCart = loadCart;

/** payload из buildCartPayload: только id выбранных опций и количество. */
export const addToCart = cartThunk('cart/addToCart', (payload) => cartService.addItem(payload));

export const updateCartItemQuantity = cartThunk('cart/updateCartItemQuantity', ({ itemId, quantity }) =>
  num(quantity) <= 0 ? cartService.removeItem(itemId) : cartService.setQuantity(itemId, num(quantity)),
);

export const removeFromCart = cartThunk('cart/removeFromCart', (arg) =>
  cartService.removeItem(arg && typeof arg === 'object' ? arg.itemId : arg),
);

export const clearCart = cartThunk('cart/clearCart', () => cartService.clear());

/** Смена филиала: сервер очищает корзину (как select_branch на сайте). */
export const changeCartBranch = cartThunk('cart/changeCartBranch', (branchId) => cartService.changeBranch(branchId));

const initialState = {
  items: [],
  itemsCount: 0,
  totalAmount: 0,
  total: 0,
  branchId: null,
  isLoading: false,
  error: null,
};

const applyCart = (state, cart) => {
  state.items = (cart.items || []).map(fromServerLine);
  state.itemsCount = cart.items_count || 0;
  state.totalAmount = num(cart.subtotal);
  state.total = state.totalAmount;
  state.branchId = cart.branch_id ?? null;
  state.isLoading = false;
  state.error = null;
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
    const thunks = [loadCart, addToCart, updateCartItemQuantity, removeFromCart, clearCart, changeCartBranch];
    thunks.forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.isLoading = true;
        })
        .addCase(thunk.fulfilled, (state, action) => applyCart(state, action.payload))
        .addCase(thunk.rejected, (state, action) => {
          state.isLoading = false;
          state.error = action.payload;
        });
    });
  },
});

export const { clearError } = cartSlice.actions;
export default cartSlice.reducer;
