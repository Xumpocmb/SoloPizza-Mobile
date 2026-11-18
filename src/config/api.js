// API Configuration for SoloPizza Mobile App

import { Platform } from 'react-native';

// Base URL for the Django API
// 03.11.2026: убрана ветка __DEV__ с 10.0.2.2 — это адрес ЭМУЛЯТОРА Android,
// на живом телефоне и на iPhone он не существует, из-за чего debug-сборки
// стучались в никуда и падали в демо-режим. Боевой адрес один для всех сборок;
// локальный бэкенд друга не используется, его сервер в интернете.
//
// 04.11.2026: веб-версия (npm run web) идёт через ОТНОСИТЕЛЬНЫЙ адрес:
// запросы попадают в прокси dev-сервера Expo (metro.config.js), который пересылает их на
// solo-pizza.by со своей стороны — так мы обходим CORS (друг его не отдаёт).
// На телефонах остаётся абсолютный боевой адрес.
export const API_BASE_URL =
  Platform.OS === 'web' ? '/api/v1' : 'https://solo-pizza.by/api/v1'; // Production URL

// Политика обработки персональных данных на сайте: ссылка у галочек согласия
// и в магазинах приложений
export const PRIVACY_URL = 'https://solo-pizza.by/privacy/';

// Web client из Google Cloud (проект Solo Pizza App). Не секрет: в id_token он стоит в aud,
// по нему сервер (GOOGLE_OAUTH_CLIENT_IDS) проверяет, что токен выдан нашему приложению.
export const GOOGLE_WEB_CLIENT_ID = '101927534807-9t8jcutga2af40hd2ppjbnlogm2uulov.apps.googleusercontent.com';
// iOS-клиент Google (bundle by.solopizza.app). id_token всё равно выдаётся на Web client (webClientId),
// поэтому серверу (GOOGLE_OAUTH_CLIENT_IDS) этот ID добавлять не нужно. URL-схема — в app.json.
export const GOOGLE_IOS_CLIENT_ID = '101927534807-s7ldodoqvid6qdvpcg5t78denkh8ua71.apps.googleusercontent.com';

// ПРОМО/АКЦИИ. На 02.11.2026 эндпоинта акций на бэкенде НЕТ (путь /promo/active/
// отдавал 404). Согласованный путь будущего эндпоинта — '/promos/active/'
// (спека app_api v2: spec-app-api-v2-orders-cart-auth.md в репо памяти).
// Пока PROMOS_ENABLED = false, promoService НЕ делает запрос вовсе: Home
// остаётся на дефолтных баннерах, сеть и консоль не шумят (дефект №3).
// После деплоя другом /promos/active/ — поставить true.
export const PROMOS_ENABLED = false;

// Слайдер баннеров на главной. Выключен по просьбе владельца 15.11.2026: блок не рисуется,
// таймер не крутится, акции не запрашиваются. Код слайдера оставлен — вернуть: true.
export const HOME_SLIDER_ENABLED = false;

// ПРОФИЛЬ / АДРЕСА / СТАТИСТИКА. На 02.11.2026 в app_api НЕТ эндпоинтов
// пользователя: /user/stats/ отвечал 404 с красным console.error на каждом
// открытии Профиля (дефект №14, пойман владельцем на веб-превью). Спека v2
// предлагает /users/me/; статистику и адреса друг ещё не описал.
// Пока USER_API_ENABLED = false, userService не делает эти запросы вовсе;
// гостю они бессмысленны даже после деплоя (нужен вход).
export const USER_API_ENABLED = false;

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication: в приложении только вход через Google/Apple (регистрация по почте — на сайте)
  AUTH: {
    // app_api (Xumpocmb/SoloPizza#2): ротация — в ответе новый refresh, старый уходит в чёрный список
    TOKEN_REFRESH: '/auth/refresh/',
    GOOGLE: '/auth/google/',
    APPLE: '/auth/apple/',
    LOGOUT: '/auth/logout/',
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
    CONTACTS: '/contacts/',
    ANNOUNCEMENTS: '/announcements/',
    CATEGORIES: '/categories/',
    CATEGORY_DETAIL: (slug) => `/categories/${slug}/`,
    PRODUCTS: '/products/',
    PRODUCT_DETAIL: (slug) => `/products/${slug}/`,
    // v1.1 (вечер 02.11.2026): друг задеплоил выбор новинок и блюдо недели
    // на сервере; branch_id обязателен, как во всём каталоге
    FEATURED: '/products/featured/',
    WEEKLY_SPECIAL: '/products/weekly-special/',
  },

  // Корзина приложения на сервере (app_api, Xumpocmb/SoloPizza#1): гостю — по X-Cart-Token,
  // после входа — по JWT. Цены и проверки опций — только на сервере.
  CART: {
    ROOT: '/cart/',
    ITEMS: '/cart/items/',
    ITEM: (id) => `/cart/items/${id}/`,
    BRANCH: '/cart/branch/',
  },

  // Оформление и заказы (app_api, Xumpocmb/SoloPizza#3) — только после входа (JWT)
  CHECKOUT: {
    OPTIONS: '/checkout/options/',
    QUOTE: '/checkout/quote/',
  },
  ORDERS: {
    LIST: '/orders/',
    DETAIL: (id) => `/orders/${id}/`,
  },
  // Профиль вошедшего пользователя (Xumpocmb/SoloPizza#2)
  ME: '/me/',
  // Книга замечаний и предложений: GET — одобренные отзывы, POST — новый (после входа, на модерацию)
  REVIEWS: '/reviews/',

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