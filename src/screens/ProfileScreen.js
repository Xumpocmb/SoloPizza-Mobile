import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import Alert from '../utils/alertShim';
import useAppTheme from '../theme/useAppTheme';
import { useDispatch, useSelector } from 'react-redux';
import { logout, updateProfile } from '../store/slices/authSlice';
import { userService, authService } from '../services';

const ProfileScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((state) => state.auth);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const statsData = await userService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
      // Set fallback stats
      setStats({
        total_orders: 0,
        total_spent: 0,
        favorite_category: 'Пицца',
        join_date: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Очищаем ошибку для поля при вводе
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Имя обязательно';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Фамилия обязательна';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Телефон обязателен';
    } else if (!/^\+?[1-9]\d{1,14}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Неверный формат телефона';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email обязателен';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Неверный формат email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await dispatch(updateProfile(formData)).unwrap();
      setIsEditing(false);
      Alert.alert('Успешно', 'Профиль обновлен');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить профиль');
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      email: user?.email || '',
    });
    setErrors({});
    setIsEditing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти из аккаунта?',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: logoutUser,
        },
      ]
    );
  };

  const logoutUser = async () => {
    try {
      await authService.logout();
      dispatch(logout());
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error logging out:', error);
      // Force logout even if API call fails
      dispatch(logout());
      navigation.navigate('Home');
    }
  };

  const menuItems = [
    {
      title: 'История заказов',
      icon: '📋',
      onPress: () => navigation.navigate('OrderHistory'),
    },
    {
      title: 'Адреса доставки',
      icon: '📍',
      onPress: () => {
        Alert.alert('В разработке', 'Функция будет доступна в следующих версиях');
      },
    },
    {
      title: 'Способы оплаты',
      icon: '💳',
      onPress: () => {
        Alert.alert('В разработке', 'Функция будет доступна в следующих версиях');
      },
    },
    {
      title: 'Уведомления',
      icon: '🔔',
      onPress: () => {
        Alert.alert('В разработке', 'Функция будет доступна в следующих версиях');
      },
    },
    {
      title: 'Поддержка',
      icon: '❓',
      onPress: () => {
        Alert.alert(
          'Поддержка',
          'Свяжитесь с нами:\n\nТелефон: +375 (29) 123-45-67\nEmail: support@solopizza.by\n\nРежим работы: 10:00 - 23:00'
        );
      },
    },
    {
      title: 'О приложении',
      icon: 'ℹ️',
      onPress: () => {
        Alert.alert(
          'О приложении',
          'SoloPizza Mobile App\nВерсия: 1.0.0\n\n© 2024 SoloPizza. Все права защищены.'
        );
      },
    },
  ];

  if (!user) {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Профиль</Text>
        </View>
        <View style={styles.guestContent}>
          <Text style={styles.guestTitle}>Добро пожаловать!</Text>
          <Text style={styles.guestText}>
            Войдите в аккаунт, чтобы получить доступ к персональным функциям
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Войти</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerButtonText}>Зарегистрироваться</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.accent]}
        />
      }
    >
      {/* Заголовок */}
      <View style={styles.header}>
        <Text style={styles.title}>Профиль</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? 'Отмена' : 'Редактировать'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Информация о пользователе */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.first_name?.charAt(0)?.toUpperCase()}
              {user.last_name?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
        </View>

        {isEditing ? (
          <View style={styles.editForm}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Имя *</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.first_name && styles.inputError,
                ]}
                placeholder="Ваше имя"
                placeholderTextColor={colors.textMuted}
                value={formData.first_name}
                onChangeText={(value) => handleInputChange('first_name', value)}
              />
              {errors.first_name && (
                <Text style={styles.errorText}>{errors.first_name}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Фамилия *</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.last_name && styles.inputError,
                ]}
                placeholder="Ваша фамилия"
                placeholderTextColor={colors.textMuted}
                value={formData.last_name}
                onChangeText={(value) => handleInputChange('last_name', value)}
              />
              {errors.last_name && (
                <Text style={styles.errorText}>{errors.last_name}</Text>
              )}
            </View>

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
              />
              {errors.phone && (
                <Text style={styles.errorText}>{errors.phone}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.email && styles.inputError,
                ]}
                placeholder="your@email.com"
                placeholderTextColor={colors.textMuted}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isLoading && styles.saveButtonDisabled,
                ]}
                onPress={handleSaveProfile}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Сохранить</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>
              {user.first_name} {user.last_name}
            </Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <Text style={styles.userPhone}>{user.phone}</Text>
          </View>
        )}
      </View>

      {/* Statistics */}
      {!isEditing && stats && (
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Статистика</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total_orders || 0}</Text>
              <Text style={styles.statLabel}>Заказов</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total_spent || 0} ₽</Text>
              <Text style={styles.statLabel}>Потрачено</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.favorite_category || 'Пицца'}</Text>
              <Text style={styles.statLabel}>Любимая категория</Text>
            </View>
          </View>
          {stats.join_date && (
            <View style={styles.joinDateContainer}>
              <Text style={styles.joinDateText}>
                С нами с {new Date(stats.join_date).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long'
                })}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Меню */}
      {!isEditing && (
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Кнопка выхода */}
      {!isEditing && (
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Выйти из аккаунта</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  guestContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.accent,
    paddingTop: Platform.OS === 'web' ? 12 : 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.buttonText,
    textAlign: 'center',
  },
  editButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    padding: 8,
  },
  editButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '500',
  },
  profileSection: {
    backgroundColor: colors.cardBg,
    marginTop: 10,
    padding: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.buttonText,
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 16,
    color: colors.textMuted,
  },
  editForm: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    color: colors.text,
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  inputError: {
    borderColor: colors.error,
  },
  // ИСПРАВЛЕНО ПРИ АУДИТЕ: в файле было ДВА определения errorText.
  // Второе (серое #6c757d, 16px, по центру) затирало первое (красное #dc3545, 14px),
  // а используется этот стиль для подписей ошибок валидации полей формы
  // (строки с errors.first_name / last_name / phone / email).
  // В результате сообщения об ошибках рисовались светло-серым и были почти не видны.
  // Возвращено значение из ПЕРВОГО определения — семантически верное.
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: 5,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.textMuted,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.divider,
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  menuSection: {
    backgroundColor: colors.cardBg,
    marginTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hoverBg,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  menuTitle: {
    fontSize: 16,
    color: colors.text,
  },
  menuArrow: {
    fontSize: 20,
    color: colors.textMuted,
  },
  logoutSection: {
    padding: 20,
    paddingBottom: 40,
  },
  logoutButton: {
    backgroundColor: colors.error,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  guestContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  guestText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  loginButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    marginBottom: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  loginButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.accent,
    minWidth: 200,
    alignItems: 'center',
  },
  registerButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsSection: {
    backgroundColor: colors.cardBg,
    marginTop: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  joinDateContainer: {
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.hoverBg,
  },
  joinDateText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});

export default ProfileScreen;