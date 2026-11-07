/**
 * Веб-заглушка для react-native-vector-icons/MaterialIcons.
 *
 * На веб шрифты иконок не линкуются; Icon.js (src/components/ui/Icon.js)
 * оборачивает require в try/catch и при ошибке переключается на эмодзи-фолбэк.
 * Этот модуль существует только для веб-сборки (webpack alias).
 */

throw new Error('vector-icons недоступны в веб-превью: Icon.js перейдёт на эмодзи');
