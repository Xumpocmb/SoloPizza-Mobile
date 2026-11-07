import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import catalogReducer from './slices/catalogSlice';
import cartReducer from './slices/cartSlice';
import orderReducer from './slices/orderSlice';
import productsReducer from './slices/productSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    catalog: catalogReducer,
    products: productsReducer, // ← ДОБАВЛЕНО: экраны читают state.products
    cart: cartReducer,
    order: orderReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

// Экспорт типов для TypeScript (если понадобится)
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;