/**
 * Денежная гигиена: цены приходят с сервера строками ("12.50", DecimalField),
 * а в корзине могут лежать старые записи вообще без цены. num() приводит всё
 * к числу и не даёт NaN/undefined уронить экран (.toFixed of undefined).
 */

export const num = (value) => {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

export default num;
