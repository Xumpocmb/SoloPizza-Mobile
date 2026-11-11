/**
 * Ошибки API приходят от apiService как { status, message, data }, где data — тело
 * ответа DRF: { field: ['сообщение'] } или { detail: 'сообщение' }.
 */

/** { field: 'первое сообщение' } для подсветки полей формы; null, если полей нет. */
export const apiFieldErrors = (error) => {
  const data = error?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const fields = {};
  Object.entries(data).forEach(([field, value]) => {
    const message = Array.isArray(value) ? value[0] : value;
    if (typeof message === 'string') fields[field] = message;
  });
  return Object.keys(fields).length ? fields : null;
};

/** Одна строка для пользователя: первое сообщение сервера или запасной текст. */
export const apiErrorMessage = (error, fallback = 'Что-то пошло не так, попробуйте ещё раз') => {
  const fields = apiFieldErrors(error);
  if (fields) return Object.values(fields)[0];
  return error?.message || fallback;
};
