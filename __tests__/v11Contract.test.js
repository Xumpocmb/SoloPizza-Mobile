/**
 * Контракт v1.1 (вечер 02.11.2026): /products/featured/ и /products/weekly-special/.
 * Форма снята с живого API и схемы; здесь — регрессии мобильного слоя:
 *  - featured уходит с branch_id и маппится в uiProduct (price-алиас);
 *  - weekly-special — ОДИН объект, не массив; при сбое блока просто нет (null);
 *  - без серверного featured работает прежняя локальная выборка.
 */

jest.mock('../src/services/apiService', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

import apiService from '../src/services/apiService';
import catalogService from '../src/services/catalogService';

const META = { currency: 'BYN', timezone: 'Europe/Minsk', default_branch_id: 1, languages: ['ru', 'en'] };
const FEATURED = [
  { id: 134, slug: 'assorti', name: 'Ассорти', min_price: '13.50', is_weekly_special: true },
];
const WEEKLY = {
  id: 134, slug: 'assorti', name: 'Ассорти', min_price: '13.50', is_weekly_special: true,
  variants: [{ id: 229, size: '25', price: '13.50', boards: [], addons: [] }],
};
const PRODUCTS = [
  { id: 6, slug: 'antaliya', name: 'Анталия', min_price: '12.50', is_weekly_special: false },
  { id: 134, slug: 'assorti', name: 'Ассорти', min_price: '13.50', is_weekly_special: true },
];

beforeEach(() => {
  apiService.get.mockReset();
  catalogService.setBranchId(null);
  catalogService.invalidate();
  apiService.get.mockImplementation((path) => {
    if (path === '/meta/') return Promise.resolve(META);
    if (path === '/products/featured/') return Promise.resolve(FEATURED);
    if (path === '/products/weekly-special/') return Promise.resolve(WEEKLY);
    if (path === '/products/') return Promise.resolve(PRODUCTS);
    return Promise.reject(new Error('HTTP 404'));
  });
});

test('featured уходит на сервер с branch_id и отдаёт price-алиас', async () => {
  const featured = await catalogService.getFeaturedProducts();
  expect(apiService.get).toHaveBeenCalledWith('/products/featured/', { branch_id: 1 }, expect.any(Object));
  expect(featured).toHaveLength(1);
  expect(featured[0].price).toBe('13.50');
});

test('weekly-special — один объект с variants, а не массив', async () => {
  const weekly = await catalogService.getWeeklySpecial();
  expect(apiService.get).toHaveBeenCalledWith('/products/weekly-special/', { branch_id: 1 }, expect.any(Object));
  expect(Array.isArray(weekly)).toBe(false);
  expect(weekly.slug).toBe('assorti');
  expect(Array.isArray(weekly.variants)).toBe(true);
  expect(weekly.price).toBe(weekly.min_price);
});

test('повторный вызов в пределах TTL не дёргает сеть (тёплый кэш v1.1)', async () => {
  await catalogService.getWeeklySpecial();
  const calls = apiService.get.mock.calls.length;
  await catalogService.getWeeklySpecial();
  expect(apiService.get.mock.calls.length).toBe(calls);
});

test('сервер без featured: локальная выборка акций, как до v1.1', async () => {
  apiService.get.mockImplementation((path) => {
    if (path === '/meta/') return Promise.resolve(META);
    if (path === '/products/') return Promise.resolve(PRODUCTS);
    return Promise.reject(new Error('HTTP 404'));
  });
  const featured = await catalogService.getFeaturedProducts();
  expect(featured.map((p) => p.slug)).toEqual(['assorti']);
});

test('weekly-special недоступен: null, экран скрывает блок без ошибки', async () => {
  apiService.get.mockImplementation((path) => {
    if (path === '/meta/') return Promise.resolve(META);
    return Promise.reject(new Error('HTTP 404'));
  });
  const weekly = await catalogService.getWeeklySpecial();
  expect(weekly).toBeNull();
});
