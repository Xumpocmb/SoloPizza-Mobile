/**
 * Веб-превью: системного календаря телефона нет, поэтому поле даты и времени браузера —
 * как в блоке «ПРЕДЗАКАЗ» на сайте. На телефоне — PreorderTimeField.js.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import useAppTheme from '../theme/useAppTheme';

const pad = (n) => String(n).padStart(2, '0');
// datetime-local хочет местное время без пояса: 2026-11-24T14:05
const toLocalInput = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export default function PreorderTimeField({ label, value, onChange, error, disabled }) {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {React.createElement('input', {
        type: 'datetime-local',
        'aria-label': label,
        disabled,
        value: value ? toLocalInput(new Date(value)) : '',
        min: toLocalInput(new Date()),
        onChange: (event) => event.target.value && onChange(new Date(event.target.value).toISOString()),
        style: {
          // шрифт как у остального приложения в браузере (у поля даты свой, с засечками)
          fontFamily: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          fontSize: 16,
          padding: '12px 14px',
          borderRadius: 12,
          border: `1px solid ${error ? colors.error : colors.divider}`,
          background: colors.cardBg,
          color: colors.text,
          colorScheme: 'dark light',
        },
      })}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    field: { marginTop: 12 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
    error: { marginTop: 4, fontSize: 12, color: colors.error },
  });
