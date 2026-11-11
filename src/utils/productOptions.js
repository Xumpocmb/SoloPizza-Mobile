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
 * Запрос «добавить в корзину» для POST /cart/items/: только id выбранного.
 * Цену, совпадение опций с размером и объединение одинаковых позиций делает сервер.
 */
export const buildCartPayload = (product, selection, quantity) => ({
  product_id: product.id,
  variant_id: selection.variant?.id ?? null,
  board1_id: selection.board1?.id ?? null,
  board2_id: selection.board2?.id ?? null,
  sauce_id: selection.sauce?.id ?? null,
  addon_ids: selection.addons.map((a) => a.id),
  drink_id: selection.drink?.id ?? null,
  quantity,
});

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
