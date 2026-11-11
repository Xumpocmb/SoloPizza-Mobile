/**
 * Опции карточки товара по контракту app_api (/products/<slug>/):
 * размер = вариант; борты и добавки свои у каждого варианта (привязаны к размеру);
 * соус и напиток — на уровне товара. Правила повторяют страницу товара на сайте:
 * соус и напиток — один, первый выбран сразу; два необязательных и разных борта;
 * добавок сколько угодно. Цена = (вариант + борты + добавки) × количество.
 */
import { num } from './money';

// Сервер отдаёт «Колбаски охотничьи (25)» и «Ветчина Рубленная (25): 0.70 руб.» —
// размер и цена уже показаны рядом, в подписи они лишние.
export const optionLabel = (name = '') => String(name).replace(/\s*\(\d+\)(:.*)?$/, '').trim();

export const variantLabel = (variant) => {
  if (!variant) return '';
  const amount = variant.size ?? variant.value;
  return [amount, variant.unit].filter((part) => part !== null && part !== undefined && part !== '').join(' ');
};

export const initialSelection = (product) => {
  const variant = product?.variants?.[0] ?? null;
  return {
    variant,
    sauce: product?.has_base_sauce ? product?.sauces?.[0] ?? null : null,
    board1: null,
    board2: null,
    addons: [],
    drink: product?.has_drink ? product?.drinks?.[0] ?? null : null,
  };
};

/** Смена размера сбрасывает борты и добавки: их id привязаны к размеру. */
export const withVariant = (selection, variant) => ({
  ...selection,
  variant,
  board1: null,
  board2: null,
  addons: [],
});

export const toggleAddon = (selection, addon) => {
  const picked = selection.addons.some((a) => a.id === addon.id);
  return {
    ...selection,
    addons: picked ? selection.addons.filter((a) => a.id !== addon.id) : [...selection.addons, addon],
  };
};

export const unitPrice = (selection) =>
  num(selection.variant?.price) +
  num(selection.board1?.price) +
  num(selection.board2?.price) +
  selection.addons.reduce((sum, a) => sum + num(a.price), 0);

export const boardsAvailable = (product, variant) => !!product?.has_border && (variant?.boards?.length ?? 0) > 0;
export const addonsAvailable = (product, variant) => !!product?.has_addons && (variant?.addons?.length ?? 0) > 0;

/**
 * Позиция корзины. id одинаков для одинакового набора опций — тогда корзина
 * увеличивает количество, а не заводит новую строку (как ключ SessionCart на сайте).
 */
export const buildCartItem = (product, selection, quantity) => {
  const { variant, sauce, board1, board2, addons, drink } = selection;
  const addonIds = addons.map((a) => a.id).sort((a, b) => a - b);
  const id = [
    product.id,
    variant?.id ?? '',
    board1 ? `b1_${board1.id}` : '',
    board2 ? `b2_${board2.id}` : '',
    sauce ? `s_${sauce.id}` : '',
    addonIds.length ? `a_${addonIds.join('_')}` : '',
    drink ? `d_${drink.id}` : '',
  ]
    .filter(Boolean)
    .join('-');

  return {
    id,
    productId: product.id,
    variantId: variant?.id ?? null,
    name: product.name,
    image: product.image ?? null,
    price: unitPrice(selection),
    quantity,
    size: variant ? { id: variant.id, name: variantLabel(variant) } : null,
    sauce: sauce ? { id: sauce.id, name: sauce.name } : null,
    boards: [board1, board2].filter(Boolean).map((b) => ({ id: b.id, name: optionLabel(b.name), price: num(b.price) })),
    addons: addons.map((a) => ({ id: a.id, name: optionLabel(a.name), price: num(a.price) })),
    drink: drink ? { id: drink.id, name: drink.name } : null,
  };
};

/** Одна строка «32 см · Итальянский соус · Борт: … · Добавки: …» для корзины. */
export const cartItemOptions = (item) => {
  const addons = item.addons ?? item.toppings ?? [];
  return [
    item.size?.name,
    item.sauce?.name,
    item.boards?.length ? `Борт: ${item.boards.map((b) => b.name).join(' + ')}` : null,
    addons.length ? `Добавки: ${addons.map((a) => optionLabel(a.name)).join(', ')}` : null,
    item.drink?.name,
  ]
    .filter(Boolean)
    .join(' · ');
};
