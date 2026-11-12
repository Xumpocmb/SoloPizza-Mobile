import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { Image, Text, View, StyleSheet, useColorScheme, Platform } from 'react-native';
import { light, dark } from '../theme/colors';

// Тема навигации = палитра сайта (src/theme/colors.js): заголовки, таб-бар, фон.
// Следует системной теме телефона, как класс .dark на сайте.
const makeNavTheme = (palette) => ({
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.accent,
    background: palette.bg,
    card: palette.headerBg,
    text: palette.text,
    border: palette.divider,
  },
});

// Импорт экранов
import HomeScreen from '../screens/HomeScreen';
import CatalogScreen from '../screens/CatalogScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import VacancyListScreen from '../screens/VacancyListScreen';
import VacancyDetailScreen from '../screens/VacancyDetailScreen';
import VacancyApplyScreen from '../screens/VacancyApplyScreen';
import ContactsScreen from '../screens/ContactsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Компонент иконки корзины с бейджем
function CartIcon({ color, size }) {
  const cartItems = useSelector(state => state.cart.items);
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <View style={styles.cartIconContainer}>
      <Text style={{ color, fontSize: size }}>🛒</Text>
      {itemCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{itemCount}</Text>
        </View>
      )}
    </View>
  );
}

// Экраны, которые открываются поверх вкладки: таб-бар внизу остаётся виден всегда.
// Каждая вкладка — свой стек; navigate('ProductDetail') кладёт экран в стек текущей вкладки.
const stackScreenOptions = {
  headerTitleAlign: 'center',
  headerStyle: {
    backgroundColor: '#079b59',
    ...(Platform.OS === 'web' ? { height: 56 } : {}),
  },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: {
    fontWeight: 'bold',
  },
};

const sharedScreens = (
  <>
    <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Вход' }} />
    <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Регистрация' }} />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Товар' }} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Оформление заказа' }} />
    <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ title: 'История заказов' }} />
    <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Детали заказа' }} />
    <Stack.Screen name="Vacancies" component={VacancyListScreen} options={{ title: 'Вакансии' }} />
    <Stack.Screen name="VacancyDetail" component={VacancyDetailScreen} options={{ title: 'Вакансия' }} />
    <Stack.Screen name="VacancyApply" component={VacancyApplyScreen} options={{ title: 'Отклик на вакансию' }} />
    <Stack.Screen name="Contacts" component={ContactsScreen} options={{ title: 'Контакты' }} />
  </>
);

const makeTabStack = (rootName, RootScreen, title) =>
  function TabStack() {
    return (
      <Stack.Navigator screenOptions={stackScreenOptions}>
        <Stack.Screen name={rootName} component={RootScreen} options={{ headerShown: false, title }} />
        {sharedScreens}
      </Stack.Navigator>
    );
  };

const HomeStack = makeTabStack('HomeMain', HomeScreen, 'Главная');
const CatalogStack = makeTabStack('CatalogMain', CatalogScreen, 'Каталог');
const CartStack = makeTabStack('CartMain', CartScreen, 'Корзина');
const ProfileStack = makeTabStack('ProfileMain', ProfileScreen, 'Профиль');

// Главный навигатор приложения
export default function AppNavigator() {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? dark : light;
  return (
    <NavigationContainer theme={makeNavTheme(palette)}>
      <Tab.Navigator
        backBehavior="history"
        screenOptions={{
          tabBarActiveTintColor: palette.accent,
          tabBarInactiveTintColor: palette.textMuted,
          tabBarStyle: {
            backgroundColor: palette.headerBg,
            borderTopWidth: 1,
            borderTopColor: palette.divider,
            height: 60,
            paddingBottom: 5,
          },
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={{
            tabBarLabel: 'Главная',
            tabBarIcon: ({ size }) => (
              <Image source={require('../../assets/logo-tab.png')} style={[styles.logoIcon, { width: size, height: size }]} />
            ),
          }}
        />
        <Tab.Screen
          name="Catalog"
          component={CatalogStack}
          options={{
            tabBarLabel: 'Каталог',
            tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>🍕</Text>,
          }}
        />
        <Tab.Screen
          name="Cart"
          component={CartStack}
          options={{
            tabBarLabel: 'Корзина',
            tabBarIcon: ({ color, size }) => <CartIcon color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileStack}
          options={{
            tabBarLabel: 'Профиль',
            tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>👤</Text>,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  logoIcon: {
    borderRadius: 6,
  },
  cartIconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: '#079b59',
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
});