// Main services export file
import apiService from './apiService';
import authService from './authService';
import catalogService from './catalogService';
import cartService from './cartService';
import orderService from './orderService';
import productService from './productService'; // ← ДОБАВЛЕН
import promoService from './promoService';     // ← ДОБАВЛЕН
import userService from './userService';       // ← ДОБАВЛЕН
import vacancyService from './vacancyService'; // ← v1.1: вакансии и отклики

export {
  apiService,
  authService,
  catalogService,
  cartService,
  orderService,
  productService,
  promoService,
  userService,
  vacancyService,
};

export default {
  api: apiService,
  auth: authService,
  catalog: catalogService,
  cart: cartService,
  order: orderService,
  product: productService,
  promo: promoService,
  user: userService,
  vacancy: vacancyService,
};
