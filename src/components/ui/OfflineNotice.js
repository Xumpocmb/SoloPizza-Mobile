/**
 * Экран «нет данных»: без интернета (по умолчанию) или с текстом ошибки сервера.
 * Показывают главная и каталог вместо пустых блоков.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from './Icon';
import useAppTheme from '../../theme/useAppTheme';
import { NO_INTERNET_MESSAGE } from '../../services/apiService';

export default function OfflineNotice({ message = NO_INTERNET_MESSAGE, onRetry }) {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const offline = message === NO_INTERNET_MESSAGE;
  return (
    <View style={styles.container}>
      <Icon name={offline ? 'wifi-off' : 'error-outline'} size={48} color={colors.textMuted} />
      <Text style={styles.title}>{message}</Text>
      {offline && <Text style={styles.text}>Проверьте интернет и попробуйте снова.</Text>}
      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry} accessibilityRole="button">
          <Text style={styles.buttonText}>Повторить</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: 32,
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
      color: colors.textMuted,
      textAlign: 'center',
    },
    button: {
      marginTop: 8,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 10,
    },
    buttonText: {
      color: colors.buttonText,
      fontSize: 16,
      fontWeight: '700',
    },
  });
