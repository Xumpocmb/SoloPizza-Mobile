/**
 * Веб-замена createNativeStackNavigator: тот же API создания навигатора,
 * но на JS-стеке, который работает в браузере. Используется только vite-сборкой.
 */

export { createStackNavigator as createNativeStackNavigator } from '@react-navigation/stack';
