import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Alert from '../utils/alertShim';
import useAppTheme from '../theme/useAppTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
// ИСПРАВЛЕНО ПРИ АУДИТЕ: прямой импорт react-native-vector-icons в v10.x
// не тянет шрифт — иконки рендерились пустыми квадратами.
import { authService } from '../services';

const LoginScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email обязателен';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = 'Некорректный формат email';
      }
    }
    
    if (!password.trim()) {
      newErrors.password = 'Пароль обязателен';
    } else if (password.length < 6) {
      newErrors.password = 'Пароль должен содержать минимум 6 символов';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const response = await authService.login({
        email: email.trim(),
        password: password,
        remember_me: rememberMe,
      });
      
      // Store tokens and user data
      await authService.storeTokens(response.access, response.refresh);
      if (response.user) {
        await authService.storeUserData(response.user);
      }
      
      navigation.replace('MainTabs');
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response?.status === 401) {
        Alert.alert('Ошибка входа', 'Неверный email или пароль');
      } else if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.email) {
          setErrors({ email: errorData.email[0] });
        }
        if (errorData.password) {
          setErrors({ password: errorData.password[0] });
        }
        if (errorData.non_field_errors) {
          Alert.alert('Ошибка', errorData.non_field_errors[0]);
        }
      } else {
        Alert.alert('Ошибка', 'Не удалось войти в систему. Попробуйте позже.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      Alert.alert('Введите email', 'Пожалуйста, введите ваш email для восстановления пароля');
      return;
    }
    
    Alert.alert(
      'Восстановление пароля',
      `Инструкции по восстановлению пароля будут отправлены на ${email}`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отправить',
          onPress: async () => {
            try {
              await authService.resetPassword({ email: email.trim() });
              Alert.alert('Отправлено', 'Проверьте вашу почту для восстановления пароля');
            } catch (error) {
              console.error('Password reset error:', error);
              Alert.alert('Ошибка', 'Не удалось отправить инструкции. Попробуйте позже.');
            }
          },
        },
      ]
    );
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Заголовок */}
        <View style={styles.header}>
          <Text style={styles.title}>Добро пожаловать!</Text>
          <Text style={styles.subtitle}>
            Войдите в свой аккаунт, чтобы продолжить
          </Text>
        </View>

        {/* Форма входа */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) {
                  setErrors(prev => ({ ...prev, email: null }));
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {/* Пароль */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Пароль</Text>
            <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Пароль"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors(prev => ({ ...prev, password: null }));
                  }
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
                accessibilityLabel={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                <Text style={styles.eyeText}>
                  {showPassword ? 'скрыть' : 'показать'}
                </Text>
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}

          </View>

          {/* Забыли пароль */}
          <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
            <Text style={[styles.forgotPasswordText, loading && styles.disabledText]}>Забыли пароль?</Text>
          </TouchableOpacity>

          {/* Кнопка входа */}
          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Войти</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Регистрация */}
        <View style={styles.registerSection}>
          <Text style={styles.registerText}>Нет аккаунта?</Text>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
          >
            <Text style={[styles.registerButtonText, loading && styles.disabledText]}>
              Нет аккаунта? <Text style={[styles.registerLink, loading && styles.disabledText]}>Зарегистрироваться</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Гостевой режим */}
        <View style={styles.guestSection}>
          <TouchableOpacity
            style={styles.guestButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.guestButtonText}>
              Продолжить без регистрации
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    color: colors.text,
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  inputError: {
    borderColor: colors.error,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  passwordInput: {
    color: colors.text,
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  eyeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: 5,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loginButtonDisabled: {
    backgroundColor: colors.divider,
    elevation: 0,
    shadowOpacity: 0,
  },
  loginButtonText: {
    color: colors.buttonText,
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  registerText: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 10,
  },
  registerButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  registerButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerLink: {
    color: colors.accent,
    fontWeight: '700',
  },
  disabledText: {
    opacity: 0.6,
  },
  guestSection: {
    alignItems: 'center',
  },
  guestButton: {
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