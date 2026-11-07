import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Alert from '../utils/alertShim';
import useAppTheme from '../theme/useAppTheme';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, clearError } from '../store/slices/authSlice';
import { authService } from '../services';

const RegisterScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const dispatch = useDispatch();
  const { isLoading, error, isAuthenticated } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      // Если пользователь успешно зарегистрирован, возвращаемся назад
      navigation.goBack();
    }
  }, [isAuthenticated, navigation]);

  useEffect(() => {
    if (error) {
      Alert.alert('Ошибка регистрации', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const validateForm = () => {
    const newErrors = {};

    // Валидация имени
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Имя обязательно';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'Имя должно содержать минимум 2 символа';
    }

    // Валидация фамилии
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Фамилия обязательна';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Фамилия должна содержать минимум 2 символа';
    }

    // Валидация email
    if (!formData.email.trim()) {
      newErrors.email = 'Email обязателен';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Неверный формат email';
    }

    // Валидация телефона
    if (!formData.phone.trim()) {
      newErrors.phone = 'Телефон обязателен';
    } else if (!/^\+?[1-9]\d{1,14}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Неверный формат телефона';
    }

    // Валидация пароля
    if (!formData.password) {
      newErrors.password = 'Пароль обязателен';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Пароль должен содержать минимум 8 символов';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Пароль должен содержать заглавные и строчные буквы, цифры';
    }

    // Валидация подтверждения пароля
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Подтверждение пароля обязательно';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    // Валидация согласия с условиями
    if (!agreedToTerms) {
      newErrors.terms = 'Необходимо согласиться с условиями использования';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Очищаем ошибку для поля при вводе
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const userData = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        password_confirm: formData.confirmPassword,
      };

      await authService.register(userData);
      Alert.alert(
        'Регистрация успешна!',
        'Проверьте вашу почту для подтверждения аккаунта',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        const newErrors = {};
        
        if (errorData.email) {
          newErrors.email = errorData.email[0];
        }
        if (errorData.phone) {
          newErrors.phone = errorData.phone[0];
        }
        if (errorData.password) {
          newErrors.password = errorData.password[0];
        }
        if (errorData.first_name) {
          newErrors.firstName = errorData.first_name[0];
        }
        if (errorData.last_name) {
          newErrors.lastName = errorData.last_name[0];
        }
        
        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
        } else if (errorData.non_field_errors) {
          Alert.alert('Ошибка регистрации', errorData.non_field_errors[0]);
        } else {
          Alert.alert('Ошибка регистрации', 'Проверьте введенные данные');
        }
      } else {
        Alert.alert('Ошибка', 'Не удалось зарегистрироваться. Попробуйте позже.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleTermsPress = () => {
    Alert.alert(
      'Условия использования',
      'Здесь будут отображены условия использования приложения SoloPizza.',
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Заголовок */}
        <View style={styles.header}>
          <Text style={styles.title}>Регистрация</Text>
          <Text style={styles.subtitle}>
            Создайте аккаунт, чтобы делать заказы
          </Text>
        </View>

        {/* Форма регистрации */}
        <View style={styles.form}>
          {/* Имя */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Имя *</Text>
            <TextInput
              style={[
                styles.input,
                errors.firstName && styles.inputError,
              ]}
              placeholder="Введите ваше имя"
              placeholderTextColor={colors.textMuted}
              value={formData.firstName}
              onChangeText={(value) => handleInputChange('firstName', value)}
              autoCapitalize="words"
              editable={!isLoading}
            />
            {errors.firstName && (
              <Text style={styles.errorText}>{errors.firstName}</Text>
            )}
          </View>

          {/* Фамилия */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Фамилия *</Text>
            <TextInput
              style={[
                styles.input,
                errors.lastName && styles.inputError,
              ]}
              placeholder="Введите вашу фамилию"
              placeholderTextColor={colors.textMuted}
              value={formData.lastName}
              onChangeText={(value) => handleInputChange('lastName', value)}
              autoCapitalize="words"
              editable={!isLoading}
            />
            {errors.lastName && (
              <Text style={styles.errorText}>{errors.lastName}</Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[
                styles.input,
                errors.email && styles.inputError,
              ]}
              placeholder="Введите ваш email"
              placeholderTextColor={colors.textMuted}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {/* Телефон */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Телефон *</Text>
            <TextInput
              style={[
                styles.input,
                errors.phone && styles.inputError,
              ]}
              placeholder="+375 (XX) XXX-XX-XX"
              placeholderTextColor={colors.textMuted}
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              keyboardType="phone-pad"
              editable={!isLoading}
            />
            {errors.phone && (
              <Text style={styles.errorText}>{errors.phone}</Text>
            )}
          </View>

          {/* Пароль */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Пароль *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.passwordInput,
                  errors.password && styles.inputError,
                ]}
                placeholder="Введите пароль"
                placeholderTextColor={colors.textMuted}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
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

          {/* Подтверждение пароля */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Подтвердите пароль *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.passwordInput,
                  errors.confirmPassword && styles.inputError,
                ]}
                placeholder="Повторите пароль"
                placeholderTextColor={colors.textMuted}
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Text style={styles.eyeText}>
                  {showConfirmPassword ? 'скрыть' : 'показать'}
                </Text>
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}
          </View>

          {/* Согласие с условиями */}
          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => {
                setAgreedToTerms(!agreedToTerms);
                if (errors.terms) {
                  setErrors(prev => ({ ...prev, terms: null }));
                }
              }}
            >
              <View
                style={[
                  styles.checkboxInner,
                  agreedToTerms && styles.checkboxChecked,
                ]}
              >
                {agreedToTerms && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.termsTextContainer}>
              <Text style={styles.termsText}>
                Я согласен с{' '}
                <Text style={styles.termsLink} onPress={handleTermsPress}>
                  условиями использования
                </Text>
                {' '}и политикой конфиденциальности
              </Text>
            </View>
          </View>
          {errors.terms && (
            <Text style={styles.errorText}>{errors.terms}</Text>
          )}

          {/* Кнопка регистрации */}
          <TouchableOpacity
            style={[
              styles.registerButton,
              (isLoading || loading) && styles.registerButtonDisabled,
            ]}
            onPress={handleRegister}
            disabled={isLoading || loading}
          >
            {(isLoading || loading) ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.registerButtonText}>Зарегистрироваться</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Вход */}
        <View style={styles.loginSection}>
          <Text style={styles.loginText}>Уже есть аккаунт?</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>Войти</Text>
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
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
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
    borderWidth: 1,
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
    fontSize: 18,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  checkboxInner: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkmark: {
    color: colors.buttonText,
    fontSize: 12,
    fontWeight: 'bold',
  },
  termsTextContainer: {
    flex: 1,
  },
  termsText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  registerButton: {
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
  registerButtonDisabled: {
    backgroundColor: '#ccc',
    elevation: 0,
    shadowOpacity: 0,
  },
  registerButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  checkboxError: {
    borderColor: colors.error,
  },
  disabledText: {
    color: '#ccc',
  },
  loginSection: {
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 10,
  },
  loginButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  loginButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RegisterScreen;