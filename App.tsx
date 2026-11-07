import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';

import { store } from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import { loadStoredTokens } from './src/store/slices/authSlice';
import { loadCart } from './src/store/slices/cartSlice';

/**
 * Восстанавливает сессию при холодном старте.
 *
 * Выделено в отдельный компонент, потому что useDispatch() можно вызывать
 * только внутри <Provider>. Пока токены не прочитаны из AsyncStorage,
 * показываем splash (иначе навигатор мигнёт экраном входа).
 */
function Bootstrap() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadStoredTokens());
    // Корзина локальная: при холодном старте восстанавливаем её из AsyncStorage,
    // иначе она «пустеет» до первого добавления товара.
    dispatch(loadCart());
  }, [dispatch]);

  return <AppNavigator />;
}

/**
 * ИСПРАВЛЕНО ПРИ АУДИТЕ 31.10.2026.
 *
 * Было: стандартный шаблон React Native (компонент NewAppScreen из пакета
 * @react-native/new-app-screen) — приложение показывало приветственный экран
 * RN, а все 10 экранов из src/screens и весь Redux store не были подключены.
 *
 * Стало: Provider + NavigationContainer (внутри AppNavigator) + SafeArea
 * + восстановление токенов при старте.
 */
export default function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Bootstrap />
      </SafeAreaProvider>
    </Provider>
  );
}
