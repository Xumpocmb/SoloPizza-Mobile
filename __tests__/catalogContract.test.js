/**
 * Тест контракта каталога (01.11.2026).
 *
 * Сеть заглушена на уровне apiService: любой запрос падает с 404, как сейчас
 * на боевом solo-pizza.by (app_api не задеплоен). Проверяем, что при включённом
 * USE_DEMO_FALLBACK сервис отдаёт данные ФОРМЫ реального app_api и что
 * обязательный branch_id уходит в query каждого запроса каталога.
 */

jest.mock('../src/services/apiService', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

import apiService from '../src/services/apiService';
import catalogService from '../src/services/catalogService';
import { API_BASE_URL } from '../src/config/api';
import { light, dark } from '../src/theme/colors';

test('база API всегда боевая: 10.0.2.2 — адрес эмулятора, на живом телефоне его нет', () => {
  expect(API_BASE_URL).toBe('https://solo-pizza.by/api/v1');
});

beforeEach(() => {
  apiService.get.mockReset();
  apiService.get.mockRejectedValue(new Error('HTTP 404'));
  catalogService.setBranchId(null);
});

describe('contract: meta и branches', () => {
  test('meta отдаёт валюту BYN, таймзону Europe/Minsk и филиал по умолчанию', async () => {
    const meta = await catalogService.getMeta();
    expect(meta.currency).toBe('BYN');
    expect(meta.timezone).toBe('Europe/Minsk');
    expect(typeof meta.default_branch_id).toBe('number');
  });

  test('branches — массив с id, name, address, phones[]', async () => {
    const branches = await catalogService.getBranches();
    expect(Array.isArray(branches)).toBe(true);
    branches.forEach((branch) => {
      expect(branch).toEqual(
        expect.objectContaining({ id: expect.any(Number), name: expect.any(String) }),
      );
      expect(Array.isArray(branch.phones)).toBe(true);
    });
  });
});

describe('contract: categories', () => {
  test('каждая категория имеет id, slug, name, product_count', async () => {
    const categories = await catalogService.getCategories();
    expect(categories.length).toBeGreaterThan(0);
    categories.forEach((category) => {
      expect(category).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          slug: expect.any(String),
          name: expect.any(String),
          product_count: expect.any(Number),
        }),
      );
    });
  });

  test('алкогольных категорий в выдаче нет (фильтр is_alcoholic на сервере)', async () => {
    const categories = await catalogService.getCategories();
    expect(categories.map((c) => c.slug)).not.toContain('pivo');
  });

  test('branch_id уходит в query запроса категорий', async () => {
    await catalogService.getCategories();
    expect(apiService.get).toHaveBeenCalledWith('/categories/', { branch_id: 1 }, expect.any(Object));
  });
});

describe('contract: products', () => {
  test('товар несёт контрактные поля и price-алиас равный min_price', async () => {
    const products = await catalogService.getProducts();
    expect(products.length).toBeGreaterThan(0);
    products.forEach((product) => {
      expect(product).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          slug: expect.any(String),
          name: expect.any(String),
          min_price: expect.any(String),
          is_weekly_special: expect.any(Boolean),
        }),
      );
      expect(product.price).toBe(product.min_price);
    });
  });

  test('фильтр category принимает id и подставляет slug категории', async () => {
    await catalogService.getCategories();
    const picca = await catalogService.getProducts({ category: 1 });
    expect(picca.length).toBeGreaterThan(0);
    expect(apiService.get).toHaveBeenCalledWith('/products/', { branch_id: 1, category: 'picca' }, expect.any(Object));
  });

  test('поиск фильтрует по имени (серверного поиска в app_api нет)', async () => {
    const found = await catalogService.searchProducts('пепперони');
    expect(found.length).toBeGreaterThan(0);
    found.forEach((product) => expect(product.name.toLowerCase()).toContain('пепперони'));
  });
});

describe('contract: product detail', () => {
  test('карточка содержит variants с boards/addons и списки sauces/drinks', async () => {
    const detail = await catalogService.getProductDetail('margerita');
    expect(detail).toEqual(
      expect.objectContaining({
        slug: 'margerita',
        has_border: true,
        has_addons: true,
      }),
    );
    expect(Array.isArray(detail.variants)).toBe(true);
    detail.variants.forEach((variant) => {
      expect(Array.isArray(variant.boards)).toBe(true);
      expect(Array.isArray(variant.addons)).toBe(true);
      expect(variant).toEqual(expect.objectContaining({ price: expect.any(String) }));
    });
    expect(Array.isArray(detail.sauces)).toBe(true);
  });

  test('добавки и борты агрегируются из вариантов без дублей', async () => {
    const addons = await catalogService.getPizzaAddons('margerita');
    const boards = await catalogService.getPizzaBoards('margerita');
    const addonIds = addons.map((addon) => addon.id);
    expect(new Set(addonIds).size).toBe(addonIds.length);
    expect(boards.length).toBeGreaterThan(0);
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
test('веб-версия использует относительную базу (прокси webpack-dev-server обходит CORS)', () => {
  jest.resetModules();
  jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));
  const { API_BASE_URL: webBase } = require('../src/config/api');
  expect(webBase).toBe('/api/v1');
  jest.dontMock('react-native');
  jest.resetModules();
});
