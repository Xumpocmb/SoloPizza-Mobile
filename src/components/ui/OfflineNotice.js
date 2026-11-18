/**
 * Экран «данных нет»: без интернета (по умолчанию) или другая причина (свой заголовок и текст).
 * Главная, каталог и карточка товара показывают его вместо пустоты.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from './Icon';
import useAppTheme from '../../theme/useAppTheme';
import { NO_INTERNET_MESSAGE } from '../../services/apiService';

export default function OfflineNotice({
  title = NO_INTERNET_MESSAGE,
  text = 'Проверьте интернет и попробуйте снова.',
  icon = 'wifi-off',
  onRetry,
  onBack,
}) {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.container}>
      <Icon name={icon} size={44} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {!!text && <Text style={styles.text}>{text}</Text>}
      <View style={styles.actions}>
        {onRetry && (
          <TouchableOpacity style={styles.primary} onPress={onRetry} accessibilityRole="button">
            <Text style={styles.primaryText}>Повторить</Text>
          </TouchableOpacity>
        )}
        {onBack && (
          <TouchableOpacity style={styles.secondary} onPress={onBack} accessibilityRole="button">
            <Text style={styles.secondaryText}>Назад</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 32,
      backgroundColor: colors.bg,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    text: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      textAlign: 'center',
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    primary: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 22,
      paddingVertical: 10,
    },
    primaryText: {
      color: colors.buttonText,
      fontSize: 15,
      fontWeight: '700',
    },
    secondary: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.divider,
      paddingHorizontal: 22,
      paddingVertical: 10,
    },
    secondaryText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
  });
