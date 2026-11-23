/**
 * Поле «Готов к» / «Доставка к»: системный выбор даты и времени.
 * Android — два системных окна подряд (дата, потом часы); iPhone — колёса даты и времени в окне.
 * В веб-превью — PreorderTimeField.web.js.
 */
import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Icon from './ui/Icon';
import useAppTheme from '../theme/useAppTheme';
import { formatOrderDate } from '../screens/OrderHistoryScreen';

export default function PreorderTimeField({ label, value, onChange, error, disabled }) {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const [draft, setDraft] = useState(null); // iPhone: время в колёсах до «Готово»

  const start = () => (value ? new Date(value) : new Date());

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: start(),
        mode: 'date',
        minimumDate: new Date(), // прошедшие дни не выбрать
        onChange: (event, date) => {
          if (event.type !== 'set' || !date) return;
          DateTimePickerAndroid.open({
            value: date,
            mode: 'time',
            is24Hour: true,
            onChange: (timeEvent, time) => {
              if (timeEvent.type === 'set' && time) onChange(time.toISOString());
            },
          });
        },
      });
    } else {
      setDraft(start());
    }
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.input, error && styles.inputError]}
        onPress={open}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatOrderDate(value) : 'не выбрано'}`}
      >
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? formatOrderDate(value) : 'Выберите дату и время'}
        </Text>
        <Icon name="event" size={20} color={colors.textMuted} />
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={!!draft} transparent animationType="fade" onRequestClose={() => setDraft(null)}>
        <Pressable style={styles.backdrop} onPress={() => setDraft(null)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            {!!draft && (
              <DateTimePicker
                value={draft}
                mode="datetime"
                display="spinner"
                locale="ru-RU"
                minuteInterval={5}
                minimumDate={new Date()}
                onChange={(event, date) => date && setDraft(date)}
              />
            )}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.secondary} onPress={() => setDraft(null)} accessibilityRole="button">
                <Text style={styles.secondaryText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primary}
                onPress={() => {
                  onChange(draft.toISOString());
                  setDraft(null);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.primaryText}>Готово</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    field: { marginTop: 12 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
    input: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.divider,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    inputError: { borderColor: colors.error },
    value: { fontSize: 16, color: colors.text },
    placeholder: { fontSize: 16, color: colors.textMuted },
    error: { marginTop: 4, fontSize: 12, color: colors.error },
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    sheet: { padding: 16, paddingBottom: 32, gap: 8, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: colors.cardBg },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    actions: { flexDirection: 'row', gap: 10 },
    primary: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: colors.accent },
    primaryText: { fontSize: 16, fontWeight: '700', color: colors.buttonText },
    secondary: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.divider },
    secondaryText: { fontSize: 16, fontWeight: '600', color: colors.text },
  });
