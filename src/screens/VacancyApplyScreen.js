/**
 * Отклик на вакансию (v1.1): POST /api/v1/vacancies/<id>/applications/.
 *
 * Поля и границы — из схемы VacancyApplication друга:
 *   name (≤100), age (16..100), phone (≤32), experience_years (0..50),
 *   work_experience — все обязательны.
 * Серверные ошибки 400 { field: [msg] } маппятся в подсветку полей,
 * локальная валидация повторяет границы, чтобы не гонять запросы зря.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { vacancyService } from '../services';
import Alert from '../utils/alertShim';
import useAppTheme from '../theme/useAppTheme';

const AGE_MIN = 16;
const AGE_MAX = 100;
const EXP_MIN = 0;
const EXP_MAX = 50;

const VacancyApplyScreen = ({ route, navigation }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const vacancyId = route.params?.vacancyId;
  const vacancyTitle = route.params?.title || 'вакансия';

  const [form, setForm] = useState({
    name: '',
    age: '',
    phone: '',
    experience_years: '',
    work_experience: '',
  });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Укажите ФИО';
    const age = Number(form.age);
    if (!form.age.trim() || !Number.isInteger(age) || age < AGE_MIN || age > AGE_MAX) {
      next.age = `Возраст: целое число от ${AGE_MIN} до ${AGE_MAX}`;
    }
    if (!form.phone.trim()) next.phone = 'Укажите телефон';
    const exp = Number(form.experience_years);
    if (
      form.experience_years.trim() === '' ||
      !Number.isInteger(exp) ||
      exp < EXP_MIN ||
      exp > EXP_MAX
    ) {
      next.experience_years = `Стаж: целое число от ${EXP_MIN} до ${EXP_MAX}`;
    }
    if (!form.work_experience.trim()) next.work_experience = 'Расскажите об опыте';
    return next;
  };

  const submit = async () => {
    const local = validate();
    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }
    setSending(true);
    try {
      await vacancyService.apply(vacancyId, {
        name: form.name.trim(),
        age: Number(form.age),
        phone: form.phone.trim(),
        experience_years: Number(form.experience_years),
        work_experience: form.work_experience.trim(),
      });
      Alert.alert('Отклик отправлен', `Мы получили ваш отклик на вакансию «${vacancyTitle}» и свяжемся с вами.`);
      navigation.goBack();
    } catch (error) {
      const data = error?.data;
      if (error?.status === 400 && data && typeof data === 'object') {
        // серверная валидация: { field: [сообщения] }
        const mapped = {};
        Object.keys(data).forEach((field) => {
          mapped[field] = Array.isArray(data[field]) ? data[field][0] : String(data[field]);
        });
        setErrors(mapped);
      } else {
        Alert.alert('Не получилось отправить', 'Проверьте подключение и попробуйте ещё раз.');
      }
    } finally {
      setSending(false);
    }
  };

  const field = (key, label, props = {}) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errors[key] && styles.inputError]}
        value={form[key]}
        onChangeText={(text) => setField(key, text)}
        placeholderTextColor={colors.textMuted}
        editable={!sending}
        {...props}
      />
      {errors[key] ? <Text style={styles.errorText}>{errors[key]}</Text> : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>
          Отклик на вакансию «{vacancyTitle}». Поля со звёздочкой обязательны.
        </Text>
        {field('name', 'ФИО *', { placeholder: 'Иванов Иван Иванович', maxLength: 100 })}
        {field('age', 'Возраст *', { placeholder: 'Например, 25', keyboardType: 'number-pad', maxLength: 3 })}
        {field('phone', 'Телефон *', { placeholder: '+375 (XX) XXX-XX-XX', keyboardType: 'phone-pad', maxLength: 32 })}
        {field('experience_years', 'Стаж работы (лет) *', { placeholder: 'Например, 2', keyboardType: 'number-pad', maxLength: 2 })}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Опыт работы *</Text>
          <TextInput
            style={[styles.input, styles.multiline, errors.work_experience && styles.inputError]}
            value={form.work_experience}
            onChangeText={(text) => setField('work_experience', text)}
            placeholder="Где и кем работали, что умеете"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            editable={!sending}
          />
          {errors.work_experience ? (
            <Text style={styles.errorText}>{errors.work_experience}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.submitButton, sending && styles.submitDisabled]}
          onPress={submit}
          disabled={sending}
        >
          <Text style={styles.submitText}>
            {sending ? 'Отправляем…' : 'Отправить отклик'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 16 },
    hint: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },
    inputContainer: { marginBottom: 14 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
    input: {
      backgroundColor: colors.cardBg,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.divider,
      color: colors.text,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
    },
    multiline: { minHeight: 110, textAlignVertical: 'top' },
    inputError: { borderColor: colors.error },
    errorText: { marginTop: 4, fontSize: 12, color: colors.error },
    submitButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 6,
    },
    submitDisabled: { opacity: 0.6 },
    submitText: { color: colors.buttonText, fontSize: 16, fontWeight: '700' },
  });

export default VacancyApplyScreen;
