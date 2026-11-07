// API Configuration for SoloPizza Mobile App

import { Platform } from 'react-native';

// Base URL for the Django API
// 03.11.2026: убрана ветка __DEV__ с 10.0.2.2 — это адрес ЭМУЛЯТОРА Android,
// на живом телефоне и на iPhone он не существует, из-за чего debug-сборки
// стучались в никуда и падали в демо-режим. Боевой адрес один для всех сборок;
// локальный бэкенд друга не используется, его сервер в интернете.
//
// 04.11.2026: веб-версия (npm run web) идёт через ОТНОСИТЕЛЬНЫЙ адрес:
// запросы попадают в прокси webpack-dev-server, который пересылает их на
// solo-pizza.by со своей стороны — так мы обходим CORS (друг его не отдаёт).
// На телефонах остаётся абсолютный боевой адрес.
export const API_BASE_URL =
  Platform.OS === 'web' ? '/api/v1' : 'https://solo-pizza.by/api/v1'; // Production URL

// ДЕМО-РЕЖИМ. Актуально на 02.11.2026: app_api ЗАДЕПЛОЕН, боевой каталог живой
// (/meta/, /branches/, /categories/, /products/ отвечают 200 — проверено живыми
// запросами, см. state/api-status.md в репо памяти). Прежняя приписка «на боевом
// все /api/v1/* отвечают 404» УСТАРЕЛА и убрана 02.11.2026 (дефект №4).
// Пока true: демо-данные ТОЙ ЖЕ ФОРМЫ подставляются ТОЛЬКО когда сервер недоступен
// или ответил 404 (страховка на offline/деградацию); успех сбрасывает флаг.
// Когда страховка станет не нужна — поставить false и удалить demoCatalog.js.
export const USE_DEMO_FALLBACK = true;

// ПРОМО/АКЦИИ. На 02.11.2026 эндпоинта акций на бэкенде НЕТ (путь /promo/active/
// отдавал 404). Согласованный путь будущего эндпоинта — '/promos/active/'
// (спека app_api v2: spec-app-api-v2-orders-cart-auth.md в репо памяти).
// Пока PROMOS_ENABLED = false, promoService НЕ делает запрос вовсе: Home
// остаётся на дефолтных баннерах, сеть и консоль не шумят (дефект №3).
// После деплоя другом /promos/active/ — поставить true.
export const PROMOS_ENABLED = false;

// ПРОФИЛЬ / АДРЕСА / СТАТИСТИКА. На 02.11.2026 в app_api НЕТ эндпоинтов
// пользователя: /user/stats/ отвечал 404 с красным console.error на каждом
// открытии Профиля (дефект №14, пойман владельцем на веб-превью). Спека v2
// предлагает /users/me/; статистику и адреса друг ещё не описал.
// Пока USER_API_ENABLED = false, userService не делает эти запросы вовсе;
// гостю они бессмысленны даже после деплоя (нужен вход).
export const USER_API_ENABLED = false;

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  // ⚠️ НЕ ЗАДЕПЛОЕНО: в app_api пока нет эндпоинтов авторизации (на сайте — allauth,
  // сессии). Пути ниже — заглушки по plan.txt; сверим с фактом, когда друг допишет.
  AUTH: {
    LOGIN: '/auth/login/',
    REGISTER: '/auth/register/',
    TOKEN_OBTAIN: '/auth/token/',
    TOKEN_REFRESH: '/auth/token/refresh/',
    TOKEN_VERIFY: '/auth/token/verify/',
    PROFILE: '/auth/profile/',
  },

  // Catalog
  // ЕДИНСТВЕННАЯ группа, чьи пути совпадают с кодом сайта (Xumpocmb/SoloPizza, app_api).
  // Источник истины: app_api/urls.py + serializers.py, снято 01.11.2026.
  // Ответы DRF без пагинации (plain-массивы). branch_id обязателен для всех,
  // кроме META и BRANCHES. Алкоголь отфильтрован на сервере (filters.py).
  CATALOG: {
    META: '/meta/',
    BRANCHES: '/branches/',
    CATEGORIES: '/categories/',
    CATEGORY_DETAIL: (slug) => `/categories/${slug}/`,
    PRODUCTS: '/products/',
    PRODUCT_DETAIL: (slug) => `/products/${slug}/`,
    // v1.1 (вечер 02.11.2026): друг задеплоил выбор новинок и блюдо недели
    // на сервере; branch_id обязателен, как во всём каталоге
    FEATURED: '/products/featured/',
    WEEKLY_SPECIAL: '/products/weekly-special/',
  },

  // Cart
  CART: {
    ITEMS: '/cart/items/',
    ITEM_DETAIL: (id) => `/cart/items/${id}/`,
    SUMMARY: '/cart/summary/',
    // ↓ ДОБАВЛЕНО ПРИ АУДИТЕ: cartService.js обращался к этим ключам,
    //   но их не было → API_ENDPOINTS.CART.ADD === undefined → TypeError.
    ADD: '/cart/add/',
    UPDATE: (id) => `/cart/update/${id}/`,
    REMOVE: (id) => `/cart/remove/${id}/`,
    CLEAR: '/cart/clear/',
    PROMO: '/cart/promo/',
  },

  // Orders
  // ⚠️ ВНИМАНИЕ: в проекте было ДВЕ несовместимые группы —
  //    `ORDER` (определена) и `ORDERS` (использовалась в orderService.js,
  //    но не существовала → 18 обращений к undefined → TypeError).
  //    Оставлены обе: ORDER — для обратной совместимости, ORDERS — рабочая.
  //    После стабилизации ORDER нужно удалить и оставить только ORDERS.
  ORDER: {
    LIST: '/order/',
    DETAIL: (id) => `/order/${id}/`,
    CREATE: '/order/create/',
    STATUS: (id) => `/order/${id}/status/`,
  },

  ORDERS: {
    LIST: '/orders/',
    DETAIL: (id) => `/orders/${id}/`,
    CREATE: '/orders/create/',
    CANCEL: (id) => `/orders/${id}/cancel/`,
    STATUS: (id) => `/orders/${id}/status/`,
    STATUSES: '/orders/statuses/',
    TRACK: (id) => `/orders/${id}/track/`,
    REPEAT: (id) => `/orders/${id}/repeat/`,
    RATE: (id) => `/orders/${id}/rate/`,
    RECEIPT: (id) => `/orders/${id}/receipt/`,
    VALIDATE: '/orders/validate/',
    DELIVERY_OPTIONS: '/orders/delivery-options/',
    DELIVERY_COST: '/orders/delivery-cost/',
    DELIVERY_TIME: '/orders/delivery-time/',
    PAYMENT_METHODS: '/orders/payment-methods/',
    PAYMENT: '/orders/payment/',
  },

  // v1.1 (вечер 02.11.2026): вакансии и отклики, филиалонезависимы
  VACANCIES: {
    LIST: '/vacancies/',
    DETAIL: (id) => `/vacancies/${id}/`,
    APPLY: (id) => `/vacancies/${id}/applications/`,
  },

  // ↓ ДОБАВЛЕНО ПРИ АУДИТЕ: нужны promoService и userService
  PROMO: {
    // путь согласован со спекой app_api v2; запрос уходит только при PROMOS_ENABLED
    ACTIVE: '/promos/active/',
    VALIDATE: '/promo/validate/',
  },

  USER: {
    PROFILE: '/auth/profile/',
    ADDRESSES: '/user/addresses/',
    STATS: '/user/stats/',
    CHANGE_PASSWORD: '/auth/password/change/',
    RESET_PASSWORD: '/auth/password/reset/',
  },
};

// HTTP Methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
};

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 10000;

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};