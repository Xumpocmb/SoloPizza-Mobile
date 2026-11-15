import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import Alert from '../utils/alertShim';
import useAppTheme from '../theme/useAppTheme';
import { authService } from '../services';
import { loadStoredTokens } from '../store/slices/authSlice';
import { loadCart } from '../store/slices/cartSlice';
import { apiErrorMessage } from '../utils/apiError';

// У библиотеки Google Sign-In нет реализации для веба; веб у нас только превью разработки
const GOOGLE_AVAILABLE = Platform.OS !== 'web';

const googleErrorMessage = (error) => {
  if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return 'На телефоне нет сервисов Google Play или их нужно обновить.';
  }
  if (error?.status === 503) return 'Вход через Google временно недоступен. Попробуйте позже.';
  return apiErrorMessage(error, 'Попробуйте ещё раз.');
};

const LoginScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState('');

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

  const handleDevTokenLogin = async () => {
    setLoading(true);
    try {
      await authService.loginWithRefreshToken(devToken.trim());
      setDevToken('');
      await finishLogin();
    } catch (error) {
      Alert.alert('Не удалось войти по токену', error?.message || 'Токен недействителен или уже использован');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Вход</Text>
      <Text style={styles.subtitle}>Войдите, чтобы оформить заказ и видеть историю заказов</Text>

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
      {!GOOGLE_AVAILABLE && (
        <Text style={styles.note}>Вход через Google работает в приложении на телефоне.</Text>
      )}

      <TouchableOpacity style={styles.guestButton} onPress={() => navigation.goBack()} disabled={loading}>
        <Text style={styles.guestButtonText}>Продолжить без входа</Text>
      </TouchableOpacity>

      {/* Только для разработки: вход тестовым refresh-токеном (веб-превью, где нет Google).
          __DEV__ = false в сборках для магазинов — блока там нет. */}
      {__DEV__ && (
        <View style={styles.devSection}>
          <Text style={styles.devTitle}>Для разработки: вход по токену</Text>
          <TextInput
            style={styles.devInput}
            placeholder="refresh-токен тестового пользователя"
            placeholderTextColor={colors.textMuted}
            value={devToken}
            onChangeText={setDevToken}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <TouchableOpacity style={styles.devButton} onPress={handleDevTokenLogin} disabled={loading || !devToken.trim()}>
            <Text style={styles.devButtonText}>Войти по токену</Text>
          </TouchableOpacity>
        </View>
      )}
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
    devSection: {
      marginTop: 24,
      padding: 16,
      gap: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.textMuted,
    },
    devTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    devInput: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.divider,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.cardBg,
    },
    devButton: {
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.textMuted,
    },
    devButtonText: {
      fontWeight: '600',
      color: colors.buttonText,
    },
  });

export default LoginScreen;
