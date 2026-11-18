/**
 * Каталог (01.11.2026, демо-режим удалён 18.11.2026).
 * Сеть заглушена на уровне apiService ответами в форме app_api: проверяем, что
 * branch_id уходит в каждый запрос, категория по id превращается в slug, а без
 * интернета сервис отдаёт ошибку — выдуманных товаров больше нет.
 */

jest.mock('../src/services/apiService', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

import apiService from '../src/services/apiService';
import catalogService from '../src/services/catalogService';
import { API_BASE_URL } from '../src/config/api';
import { light, dark } from '../src/theme/colors';

const META = { currency: 'BYN', timezone: 'Europe/Minsk', default_branch_id: 1 };
const CATEGORIES = [{ id: 1, slug: 'picca', name: 'Пицца', product_count: 1 }];
const PRODUCTS = [{ id: 7, slug: 'margerita', name: 'Маргарита', min_price: '12.50', category: 'picca' }];

test('база API всегда боевая: 10.0.2.2 — адрес эмулятора, на живом телефоне его нет', () => {
  expect(API_BASE_URL).toBe('https://solo-pizza.by/api/v1');
});

beforeEach(() => {
  apiService.get.mockReset();
  apiService.get.mockImplementation((path) => {
    if (path === '/meta/') return Promise.resolve(META);
    if (path === '/categories/') return Promise.resolve(CATEGORIES);
    if (path === '/products/') return Promise.resolve(PRODUCTS);
    return Promise.reject({ status: 404, message: 'Not found' });
  });
  catalogService.setBranchId(null);
});

describe('каталог', () => {
  test('branch_id уходит в query запроса категорий', async () => {
    await catalogService.getCategories({ force: true });
    expect(apiService.get).toHaveBeenCalledWith('/categories/', { branch_id: 1 }, expect.any(Object));
  });

  test('у товара price-алиас равен min_price', async () => {
    const [product] = await catalogService.getProducts({ force: true });
    expect(product.price).toBe('12.50');
  });

  test('фильтр category принимает id и подставляет slug категории', async () => {
    await catalogService.getCategories({ force: true });
    await catalogService.getProducts({ category: 1 });
    expect(apiService.get).toHaveBeenCalledWith('/products/', { branch_id: 1, category: 'picca' }, expect.any(Object));
  });

  test('без интернета — ошибка, а не выдуманные данные', async () => {
    apiService.get.mockRejectedValue({ status: 0, message: 'Нет подключения к интернету' });
    await expect(catalogService.getCategories({ force: true })).rejects.toMatchObject({ status: 0 });
  });
});

describe('theme: палитра сайта', () => {
  test('светлая и тёмная темы совпадают с CSS-переменными сайта', () => {
    expect(light.accent).toBe('#079b59');
    expect(light.bg).toBe('#f8f9fa');
    expect(light.cardBg).toBe('#ffffff');
    expect(dark.bg).toBe('#2a2a2a');
    expect(dark.cardBg).toBe('#373737');
    expect(dark.headerBg).toBe('#1e1e1e');
    expect(light.borderRadius).toBe(20);
    expect(dark.borderRadius).toBe(20);
  });
});

// 04.11.2026: веб-превью на ПК ходит в живой API через прокси dev-сервера
// (CORS друг не отдаёт), поэтому на web база ОТНОСИТЕЛЬНАЯ — '/api/v1'.
test('веб-версия использует относительную базу (прокси dev-сервера Expo обходит CORS)', () => {
  jest.resetModules();
  jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));
  const { API_BASE_URL: webBase } = require('../src/config/api');
  expect(webBase).toBe('/api/v1');
  jest.dontMock('react-native');
  jest.resetModules();
});
