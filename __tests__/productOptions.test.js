import {
  optionLabel,
  variantLabel,
  initialSelection,
  withVariant,
  toggleAddon,
  unitPrice,
  buildCartPayload,
  cartItemOptions,
} from '../src/utils/productOptions';

// Форма ответа /api/v1/products/assorti/?branch_id=1 (снято с боевого 11.11.2026, сокращено)
const pizza = {
  id: 134,
  name: 'Ассорти',
  image: 'https://solo-pizza.by/media/item_images/a.jpg',
  has_base_sauce: true,
  has_border: true,
  has_addons: true,
  has_drink: false,
  variants: [
    {
      id: 229, size: '25', value: null, unit: 'см', price: '13.50',
      boards: [{ id: 1, name: 'Колбаски охотничьи (25)', price: '3.00' }, { id: 7, name: 'Сырный (25)', price: '2.50' }],
      addons: [{ id: 1, name: 'Ветчина Рубленная (25): 0.70 руб.', price: '0.70' }, { id: 4, name: 'Халапеньо (25): 0.50 руб.', price: '0.50' }],
    },
    {
      id: 248, size: '32', value: null, unit: 'см', price: '26.50',
      boards: [{ id: 2, name: 'Колбаски охотничьи (32)', price: '3.00' }],
      addons: [{ id: 2, name: 'Ветчина Рубленная (32): 0.70 руб.', price: '0.70' }],
    },
  ],
  sauces: [{ id: 2, name: 'Бургер соус-основа' }, { id: 3, name: 'Итальянский соус-основа' }],
  drinks: [],
};

test('подписи опций без размера и цены, вариант — размер с единицей', () => {
  expect(optionLabel('Колбаски охотничьи (25)')).toBe('Колбаски охотничьи');
  expect(optionLabel('Ветчина Рубленная (25): 0.70 руб.')).toBe('Ветчина Рубленная');
  expect(optionLabel('Сыр')).toBe('Сыр');
  expect(variantLabel(pizza.variants[1])).toBe('32 см');
  expect(variantLabel({ size: null, value: '0.5', unit: 'л' })).toBe('0.5 л');
});

test('по умолчанию: первый размер и первый соус, бортов и добавок нет', () => {
  const s = initialSelection(pizza);
  expect(s.variant.id).toBe(229);
  expect(s.sauce.id).toBe(2);
  expect([s.board1, s.board2, s.drink]).toEqual([null, null, null]);
  expect(unitPrice(s)).toBeCloseTo(13.5);
});

test('цена = вариант + борты + добавки; смена размера сбрасывает борты и добавки', () => {
  let s = initialSelection(pizza);
  s = { ...s, board1: pizza.variants[0].boards[0], board2: pizza.variants[0].boards[1] };
  s = toggleAddon(s, pizza.variants[0].addons[0]);
  expect(unitPrice(s)).toBeCloseTo(13.5 + 3 + 2.5 + 0.7);
  s = toggleAddon(s, pizza.variants[0].addons[0]);
  expect(s.addons).toEqual([]);

  s = withVariant({ ...s, board1: pizza.variants[0].boards[0] }, pizza.variants[1]);
  expect(s.board1).toBeNull();
  expect(unitPrice(s)).toBeCloseTo(26.5);
});

test('запрос в корзину: только id выбранного, цену считает сервер', () => {
  const selection = {
    ...initialSelection(pizza),
    board1: pizza.variants[0].boards[0],
    addons: [pizza.variants[0].addons[1], pizza.variants[0].addons[0]],
  };
  expect(buildCartPayload(pizza, selection, 2)).toEqual({
    product_id: 134, variant_id: 229, board1_id: 1, board2_id: null, sauce_id: 2,
    addon_ids: [4, 1], drink_id: null, quantity: 2,
  });
});

test('опции позиции корзины одной строкой', () => {
  const line = {
    size: { name: '25 см' },
    sauce: { name: 'Бургер соус-основа' },
    boards: [{ name: 'Колбаски охотничьи' }],
    addons: [{ name: 'Ветчина Рубленная (25): 0.70 руб.' }, { name: 'Халапеньо' }],
    drink: null,
  };
  expect(cartItemOptions(line)).toBe('25 см · Бургер соус-основа · Борт: Колбаски охотничьи · Добавки: Ветчина Рубленная, Халапеньо');
});

test('старые позиции корзины с toppings тоже описываются', () => {
  expect(cartItemOptions({ size: { name: 'Большая' }, toppings: [{ name: 'Сыр' }] })).toBe('Большая · Добавки: Сыр');
});
