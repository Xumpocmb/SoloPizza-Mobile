/**
 * Палитра Solo Pizza — один в один с CSS-переменными сайта.
 *
 * Источник: сообщение Xumpocmb Dev от 01.11.2026 («оформление приложения
 * должно быть в таком же стиле как сайт»), блоки :root и .dark.
 * Если сайт меняет переменные — меняем только этот файл.
 */

export const light = {
  accent: '#079b59',
  accentRgba: 'rgba(7, 155, 89, 0.3)',
  errorRgba: 'rgba(220, 53, 69, 0.1)',
  bg: '#f8f9fa',
  text: '#333333',
  hoverBg: '#ecf0f1',
  cardBg: '#ffffff',
  headerBg: '#ffffff',
  switchBg: '#cccccc',
  switchThumb: '#ffffff',
  borderRadius: 20,
  divider: '#e0e0e0',
  textMuted: '#6c757d',
  success: '#28a745',
  error: '#dc3545',
  buttonText: '#ffffff',
};

export const dark = {
  accent: '#079b59',
  accentRgba: 'rgba(7, 155, 89, 0.3)',
  errorRgba: 'rgba(213, 58, 58, 0.25)',
  bg: '#2a2a2a',
  text: '#f1f1f1',
  hoverBg: '#2c2c2c',
  cardBg: '#373737',
  headerBg: '#1e1e1e',
  switchBg: '#666666',
  switchThumb: '#dddddd',
  borderRadius: 20,
  divider: '#444444',
  textMuted: '#9a9a9a',
  success: '#4caf50',
  error: '#d53a3a',
  buttonText: '#ffffff',
};

export default { light, dark };
