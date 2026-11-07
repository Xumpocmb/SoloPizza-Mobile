/**
 * ДЕМО-КАТАЛОГ (временный файл).
 *
 * Зачем: на 01.11.2026 app_api существует только в коде сайта (Xumpocmb/SoloPizza),
 * на боевом solo-pizza.by все /api/v1/* отвечают 404 — друг ещё не задеплоил.
 * Чтобы приложение и дизайн можно было смотреть на телефоне уже сейчас,
 * catalogService при сетевой ошибке подставляет данные ОТ ТОЙ ЖЕ ФОРМЫ,
 * что отдаёт реальный app_api (поля сняты с app_api/serializers.py).
 *
 * Форма ответов = контрактapp_api, ничего своего:
 *   category : { id, slug, name, image, product_count }
 *   product  : { id, slug, name, description, image, min_price,
 *                is_weekly_special, is_spicy, is_sweet, is_combo }
 *   detail   : product + { has_base_sauce, has_border, has_addons, has_drink,
 *                variants:[{ id, size, value, unit, price,
 *                            boards:[{id,name,price}], addons:[{id,name,price}] }],
 *                sauces:[{id,name}], drinks:[{id,name}] }
 *
 * Как убрать: в config/api.js поставить USE_DEMO_FALLBACK = false и удалить файл.
 * Изображения: null — UI обязан корректно рисовать товар без картинки
 * (реальный API тоже может прислать null: ImageField(blank=True, null=True)).
 */

const BRANCHES = [
  {
    id: 1,
    name: 'Соло Пицца',
    address: 'г. Минск, ул. Притыцкого, 156',
    phones: ['+375 (29) 123-45-67'],
  },
];

const META = {
  currency: 'BYN',
  timezone: 'Europe/Minsk',
  default_branch_id: 1,
  languages: ['ru', 'be'],
};

const SAUCES = [
  { id: 1, name: 'Томатный' },
  { id: 2, name: 'Сливочный' },
  { id: 3, name: 'Барбекю' },
];

const BOARDS = {
  25: [
    { id: 11, name: 'Традиционный (25)', price: '0.00' },
    { id: 12, name: 'Сырный (25)', price: '3.50' },
  ],
  30: [
    { id: 21, name: 'Традиционный (30)', price: '0.00' },
    { id: 22, name: 'Сырный (30)', price: '4.50' },
  ],
};

const ADDONS = {
  25: [
    { id: 31, name: 'Пепперони (25): 4.00 руб.', price: '4.00' },
    { id: 32, name: 'Грибы (25): 3.00 руб.', price: '3.00' },
  ],
  30: [
    { id: 41, name: 'Пепперони (30): 5.50 руб.', price: '5.50' },
    { id: 42, name: 'Грибы (30): 4.00 руб.', price: '4.00' },
  ],
};

function pizzaVariants(baseId, p25, p30) {
  return [
    { id: baseId, size: '25', value: null, unit: 'pcs', price: p25, boards: BOARDS[25], addons: ADDONS[25] },
    { id: baseId + 1, size: '30', value: null, unit: 'pcs', price: p30, boards: BOARDS[30], addons: ADDONS[30] },
  ];
}

const CATEGORIES = [
  { id: 1, slug: 'picca', name: 'Пицца', image: null },
  { id: 2, slug: 'kalcone', name: 'Кальцоне', image: null },
  { id: 3, slug: 'burgery', name: 'Бургеры', image: null },
  { id: 4, slug: 'kombo', name: 'Комбо', image: null },
  { id: 5, slug: 'sousy', name: 'Соусы', image: null },
  { id: 6, slug: 'napitki', name: 'Напитки', image: null },
];

const PRODUCTS = [
  {
    id: 101, slug: 'margerita', name: 'Маргарита', category: 'picca',
    description: 'Томатный соус, моцарелла, базилик.',
    image: null, min_price: '19.90',
    is_weekly_special: true, is_spicy: false, is_sweet: false, is_combo: false,
    has_base_sauce: true, has_border: true, has_addons: true, has_drink: false,
    variants: pizzaVariants(1001, '19.90', '25.50'),
    sauces: SAUCES, drinks: [],
  },
  {
    id: 102, slug: 'pepperoni', name: 'Пепперони', category: 'picca',
    description: 'Томатный соус, моцарелла, пепперони.',
    image: null, min_price: '23.90',
    is_weekly_special: false, is_spicy: true, is_sweet: false, is_combo: false,
    has_base_sauce: true, has_border: true, has_addons: true, has_drink: false,
    variants: pizzaVariants(1003, '23.90', '29.90'),
    sauces: SAUCES, drinks: [],
  },
  {
    id: 103, slug: 'chiken-rancho', name: 'Цыплёнок Ранчо', category: 'picca',
    description: 'Сливочный соус, цыплёнок, грибы, моцарелла.',
    image: null, min_price: '25.50',
    is_weekly_special: false, is_spicy: false, is_sweet: false, is_combo: false,
    has_base_sauce: true, has_border: true, has_addons: true, has_drink: false,
    variants: pizzaVariants(1005, '25.50', '31.90'),
    sauces: SAUCES, drinks: [],
  },
  {
    id: 201, slug: 'kalcone-s-vetchinoj', name: 'Кальцоне с ветчиной', category: 'kalcone',
    description: 'Закрытая пицца с ветчиной, грибами и моцареллой.',
    image: null, min_price: '21.00',
    is_weekly_special: false, is_spicy: false, is_sweet: false, is_combo: false,
    has_base_sauce: true, has_border: false, has_addons: false, has_drink: false,
    variants: pizzaVariants(2001, '21.00', '26.00'),
    sauces: SAUCES, drinks: [],
  },
  {
    id: 301, slug: 'burger-classic', name: 'Бургер Классический', category: 'burgery',
    description: 'Говяжья котлета, салат, томат, фирменный соус.',
    image: null, min_price: '15.90',
    is_weekly_special: false, is_spicy: false, is_sweet: false, is_combo: false,
    has_base_sauce: false, has_border: false, has_addons: false, has_drink: false,
    variants: [{ id: 3001, size: null, value: '1', unit: 'pcs', price: '15.90', boards: [], addons: [] }],
    sauces: [], drinks: [],
  },
  {
    id: 401, slug: 'kombo-pizza-25', name: 'Комбо: пицца 25 + напиток', category: 'kombo',
    description: 'Любая пицца 25 см и напиток 0.5 л.',
    image: null, min_price: '27.90',
    is_weekly_special: false, is_spicy: false, is_sweet: false, is_combo: true,
    has_base_sauce: true, has_border: true, has_addons: true, has_drink: true,
    variants: [
      {
        id: 4001, size: '25', value: null, unit: 'pcs', price: '27.90',
        boards: BOARDS[25], addons: ADDONS[25],
      },
    ],
    sauces: SAUCES,
    drinks: [
      { id: 1, name: 'Coca-Cola 0.5' },
      { id: 2, name: 'Спрайт 0.5' },
    ],
  },
  {
    id: 501, slug: 'sous-chesnochnyj', name: 'Соус чесночный', category: 'sousy',
    description: 'Нежный соус на основе сметаны и чеснока.',
    image: null, min_price: '2.50',
    is_weekly_special: false, is_spicy: false, is_sweet: false, is_combo: false,
    has_base_sauce: false, has_border: false, has_addons: false, has_drink: false,
    variants: [{ id: 5001, size: null, value: '50', unit: 'g', price: '2.50', boards: [], addons: [] }],
    sauces: [], drinks: [],
  },
  {
    id: 601, slug: 'coca-cola-classic', name: 'Coca-Cola', category: 'napitki',
    description: 'Классическая Coca-Cola, 0.5 л.',
    image: null, min_price: '4.50',
    is_weekly_special: false, is_spicy: false, is_sweet: true, is_combo: false,
    has_base_sauce: false, has_border: false, has_addons: false, has_drink: false,
    variants: [{ id: 6001, size: null, value: '0.5', unit: 'l', price: '4.50', boards: [], addons: [] }],
    sauces: [], drinks: [],
  },
];

function listItem(p) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    image: p.image,
    min_price: p.min_price,
    is_weekly_special: p.is_weekly_special,
    is_spicy: p.is_spicy,
    is_sweet: p.is_sweet,
    is_combo: p.is_combo,
  };
}

function categoryWithCount(slug) {
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) return null;
  const count = PRODUCTS.filter((p) => p.category === slug).length;
  return { ...category, product_count: count };
}

/**
 * Мини-роутер по путям app_api. Возвращает данные той же формы, что реальный API.
 * @param {string} path  путь из API_ENDPOINTS.CATALOG (без query)
 * @param {object} params query-параметры ({ branch_id, category, search })
 * @param {string} [slugParam] slug для detail-эндпоинтов
 */
export function resolveDemo(path, params = {}, slugParam = null) {
  if (path.endsWith('/meta/')) return { ...META };
  if (path.endsWith('/branches/')) return BRANCHES.map((b) => ({ ...b }));

  if (path.endsWith('/categories/') && !slugParam) {
    return CATEGORIES.map((c) => categoryWithCount(c.slug));
  }

  if (slugParam && path.startsWith('/categories/')) {
    const category = categoryWithCount(slugParam);
    if (!category) return null;
    return {
      ...category,
      products: PRODUCTS.filter((p) => p.category === slugParam).map(listItem),
    };
  }

  if (path.endsWith('/products/') && !slugParam) {
    let items = PRODUCTS;
    if (params.category) items = items.filter((p) => p.category === params.category);
    if (params.search) {
      const q = String(params.search).toLowerCase();
      items = items.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q),
      );
    }
    return items.map(listItem);
  }

  if (slugParam && path.startsWith('/products/')) {
    const product = PRODUCTS.find((p) => p.slug === slugParam || String(p.id) === String(slugParam));
    return product ? { ...product } : null;
  }

  return null;
}

export const DEMO_NOTICE = 'Демо-данные: API каталога ещё не задеплоен на solo-pizza.by';

export default { resolveDemo, DEMO_NOTICE, META, BRANCHES, CATEGORIES, PRODUCTS };
