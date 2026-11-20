import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import Alert from '../utils/alertShim';
import useAppTheme from '../theme/useAppTheme';
import { authService } from '../services';
import { loadStoredTokens } from '../store/slices/authSlice';
import { loadCart } from '../store/slices/cartSlice';
import { apiErrorMessage } from '../utils/apiError';
import { GOOGLE_IOS_CLIENT_ID } from '../config/api';

// Google: на вебе у библиотеки нет реализации (веб — только превью), на iPhone нужен iOS-клиент
const GOOGLE_AVAILABLE = Platform.OS === 'android' || (Platform.OS === 'ios' && !!GOOGLE_IOS_CLIENT_ID);

const googleErrorMessage = (error) => {
  if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return 'На телефоне нет сервисов Google Play или их нужно обновить.';
  }
  if (error?.status === 503) return 'Вход через Google временно недоступен. Попробуйте позже.';
  return apiErrorMessage(error, 'Попробуйте ещё раз.');
};

const LoginScreen = ({ navigation }) => {
  const { colors, isDark } = useAppTheme();
  const styles = makeStyles(colors);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    // Sign in with Apple есть только на iPhone (iOS 13+); на Android и вебе — false
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);

  const finishLogin = async () => {
    await dispatch(loadStoredTokens());
    dispatch(loadCart()); // с JWT сервер отдаёт корзину пользователя (гостевая уже в неё влита)
    navigation.goBack();
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const user = await authService.loginWithGoogle();
      if (user) await finishLogin(); // null — закрыл выбор аккаунта, ничего не делаем
    } catch (error) {
      if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) return;
      Alert.alert('Не удалось войти через Google', googleErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      const user = await authService.loginWithApple();
      if (user) await finishLogin(); // null — закрыл окно Apple
    } catch (error) {
      Alert.alert(
        'Не удалось войти через Apple',
        error?.status === 503 ? 'Вход через Apple временно недоступен. Попробуйте позже.' : apiErrorMessage(error, 'Попробуйте ещё раз.'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Вход</Text>
      <Text style={styles.subtitle}>Войдите, чтобы оформить заказ и видеть историю заказов</Text>

      {appleAvailable && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={
            isDark
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={14}
          style={styles.appleButton}
          onPress={loading ? () => {} : handleAppleLogin}
        />
      )}

      {(GOOGLE_AVAILABLE || Platform.OS === 'web') && (
      <TouchableOpacity
        style={[styles.googleButton, (!GOOGLE_AVAILABLE || loading) && styles.disabled]}
        onPress={handleGoogleLogin}
        disabled={!GOOGLE_AVAILABLE || loading}
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator size="small" color="#1f1f1f" />
        ) : (
          <>
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.googleText}>Войти через Google</Text>
          </>
        )}
      </TouchableOpacity>
      )}
      {Platform.OS === 'web' && (
        <Text style={styles.note}>Вход через Google работает в приложении на телефоне.</Text>
      )}

      <TouchableOpacity style={styles.guestButton} onPress={() => navigation.goBack()} disabled={loading}>
        <Text style={styles.guestButtonText}>Продолжить без входа</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

const makeStyles = (colors) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 32,
      backgroundColor: colors.bg,
    },
    title: {
      fontSize: 26,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 21,
      marginBottom: 28,
    },
    appleButton: {
      height: 48,
      marginBottom: 12,
    },
    // светлая кнопка в стиле Google: белый фон, тёмный текст, тонкая рамка
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#dadce0',
      backgroundColor: '#ffffff',
    },
    googleG: {
      fontSize: 18,
      fontWeight: '700',
      color: '#4285f4',
    },
    googleText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1f1f1f',
    },
    disabled: {
      opacity: 0.5,
    },
    note: {
      marginTop: 8,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
    },
    guestButton: {
      alignSelf: 'center',
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    guestButtonText: {
      color: colors.textMuted,
      fontSize: 14,
      textDecorationLine: 'underline',
    },
  });

export default LoginScreen;
