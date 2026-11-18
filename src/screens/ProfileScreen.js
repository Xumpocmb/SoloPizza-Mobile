import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Alert from '../utils/alertShim';
import Icon from '../components/ui/Icon';
import useAppTheme from '../theme/useAppTheme';
import { useDispatch, useSelector } from 'react-redux';
import { logout, updateProfile } from '../store/slices/authSlice';
import { authService } from '../services';
import { apiErrorMessage } from '../utils/apiError';
import { loadCart } from '../store/slices/cartSlice';

const ProfileScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((state) => state.auth);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '' });
  const [errors, setErrors] = useState({});

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await dispatch(updateProfile({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
      })).unwrap();
      setIsEditing(false);
    } catch (message) {
      Alert.alert('Ошибка', String(message));
    }
  };

  const handleCancelEdit = () => {
    setErrors({});
    setIsEditing(false);
  };

  const startEdit = () => {
    // поля — из текущего пользователя: при монтировании экрана он мог ещё не загрузиться
    setFormData({ first_name: user?.first_name || '', last_name: user?.last_name || '' });
    setErrors({});
    setIsEditing(true);
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
      dispatch(loadCart()); // корзина пользователя осталась на сервере, у гостя — пустая
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error logging out:', error);
      // Force logout even if API call fails
      dispatch(logout());
      navigation.navigate('Home');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Удалить аккаунт?',
      'Имя, почта и вход будут удалены навсегда, восстановить их нельзя. ' +
        'Заказы останутся в истории пиццерии без привязки к вам.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: deleteAccount },
      ]
    );
  };

  const deleteAccount = async () => {
    try {
      await authService.deleteAccount();
      dispatch(logout());
      dispatch(loadCart());
      navigation.navigate('Home');
      Alert.alert('Аккаунт удалён', 'Ваши данные удалены.');
    } catch (error) {
      Alert.alert('Не удалось удалить аккаунт', apiErrorMessage(error, 'Попробуйте ещё раз.'));
    }
  };

  const menuItems = [
    {
      title: 'История заказов',
      icon: '📋',
      onPress: () => navigation.navigate('OrderHistory'),
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
            onPress={() => navigation.navigate('Contacts')}
          >
            <Text style={styles.registerButtonText}>Контакты</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
    >
      {/* Заголовок */}
      <View style={styles.header}>
        <Text style={styles.title}>Профиль</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={isEditing ? handleCancelEdit : startEdit}
          accessibilityRole="button"
          accessibilityLabel={isEditing ? 'Отменить изменения' : 'Изменить имя'}
        >
          <Icon name={isEditing ? 'close' : 'edit'} size={22} color={colors.buttonText} />
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
              <Text style={styles.label}>Фамилия</Text>
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
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
            accessibilityRole="button"
          >
            <Text style={styles.deleteAccountText}>Удалить аккаунт</Text>
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
  // на одной линии с заголовком: низ шапки, а не вся её высота вместе с зоной строки состояния
  editButton: {
    position: 'absolute',
    right: 8,
    bottom: 6,
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
  // необратимое действие — неброская ссылка под «Выйти», а не вторая большая кнопка
  deleteAccountButton: {
    alignSelf: 'center',
    marginTop: 16,
    padding: 8,
  },
  deleteAccountText: {
    color: colors.error,
    fontSize: 14,
    textDecorationLine: 'underline',
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
  // три кнопки гостя: одна ширина, одна высота (рамка 2 у обеих), одинаковый шаг
  loginButton: {
    backgroundColor: colors.accent,
    width: '100%',
    maxWidth: 260,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.accent,
    marginBottom: 10,
    alignItems: 'center',
  },
  loginButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerButton: {
    backgroundColor: 'transparent',
    width: '100%',
    maxWidth: 260,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.accent,
    marginBottom: 10,
    alignItems: 'center',
  },
  registerButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;