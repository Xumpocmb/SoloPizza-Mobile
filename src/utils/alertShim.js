/**
 * Кросс-платформенные диалоги (02.11.2026, дефект №15).
 *
 * Проблема: экраны пользовались `Alert.alert` из react-native. На телефоне
 * это нативный диалог, а в веб-превью (react-native-web) Alert не реализован:
 * кнопка «Очистить» в корзине выглядела мёртвой — клик уходил в пустоту.
 *
 * Решение: единая точка `alert(...)` с тем же списком аргументов, что и у
 * Alert.alert:
 *  - native → прозрачно передаём в Alert.alert;
 *  - web    → window.alert для уведомлений и window.confirm для подтверждений
 *    (кнопка со style:'cancel' считается отменой, исполняется другая кнопка).
 *
 * Экраны импортируют: `import { alert as Alert } from '../utils/alertShim';`
 * и продолжают писать Alert.alert(...) без изменений в логике.
 */

import { Alert, Platform } from 'react-native';

export function alert(title, message = '', buttons) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : String(title);

  if (!buttons || buttons.length === 0) {
    window.alert(text);
    return;
  }

  if (buttons.length === 1) {
    window.alert(text);
    if (buttons[0].onPress) buttons[0].onPress();
    return;
  }

  const confirmed = window.confirm(text);
  const cancel = buttons.find((button) => button.style === 'cancel');
  const action =
    buttons.find((button) => button.style !== 'cancel') || buttons[buttons.length - 1];
  const chosen = confirmed ? action : cancel;
  if (chosen && chosen.onPress) chosen.onPress();
}

export default { alert };
