/**
 * Предзаказ «Готов к» / «Доставка к»: часы приёма по дням приходят с сервера
 * (preorder_days в /checkout/options/), время клиент выбирает в календаре телефона.
 */

// shortcut: Минск круглый год UTC+3 (без летнего времени); сменится пояс — брать смещение из preorder_days
const MINSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const minskDate = (ms) => new Date(ms + MINSK_OFFSET_MS).toISOString().slice(0, 10);

/** Первое и последнее время приёма по каждому дню. */
export const preorderWindows = (days = []) =>
  days
    .filter((day) => day.times?.length)
    .map((day) => ({ date: day.date, label: day.label, from: day.times[0], to: day.times[day.times.length - 1] }));

/** «Сегодня: 16:15–21:30 · Завтра: 11:00–21:30» — подсказка под переключателем. */
export const preorderHours = (days) =>
  preorderWindows(days)
    .map((day) => `${day.label}: ${day.from.label}–${day.to.label}`)
    .join(' · ');

/** Границы для календаря: от первого до последнего доступного времени. */
export const preorderRange = (days) => {
  const windows = preorderWindows(days);
  if (!windows.length) return null;
  return { min: new Date(windows[0].from.value), max: new Date(windows[windows.length - 1].to.value) };
};

/** null — время подходит; иначе понятное объяснение, почему нет. */
export const preorderProblem = (days, iso) => {
  const moment = new Date(iso).getTime();
  const day = preorderWindows(days).find((item) => item.date === minskDate(moment));
  if (!day) return 'На этот день предзаказ недоступен. Выберите другой день.';
  if (moment < new Date(day.from.value).getTime() || moment > new Date(day.to.value).getTime()) {
    return `${day.label} предзаказ можно с ${day.from.label} до ${day.to.label}.`;
  }
  return null;
};
