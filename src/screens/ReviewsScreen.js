/**
 * Книга замечаний и предложений: форма отзыва (после входа) и одобренные отзывы.
 * Новый отзыв попадает на модерацию сайта и в ленте появится после одобрения.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import Alert from '../utils/alertShim';
import useAppTheme from '../theme/useAppTheme';
import reviewService, { REVIEW_TEXT_MAX } from '../services/reviewService';
import { apiErrorMessage } from '../utils/apiError';

const Stars = ({ value, size, colors, onChange }) => (
  <View style={{ flexDirection: 'row', gap: onChange ? 8 : 2 }}>
    {[1, 2, 3, 4, 5].map((n) => {
      const star = (
        <Text style={{ fontSize: size, color: n <= value ? '#f5b301' : colors.divider }}>★</Text>
      );
      return onChange ? (
        <TouchableOpacity
          key={n}
          onPress={() => onChange(n)}
          accessibilityRole="button"
          accessibilityLabel={`Оценка ${n} из 5`}
          accessibilityState={{ selected: n === value }}
        >
          {star}
        </TouchableOpacity>
      ) : (
        <View key={n}>{star}</View>
      );
    })}
  </View>
);

const ReviewsScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const user = useSelector((state) => state.auth.user);
  const [reviews, setReviews] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await reviewService.list();
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      setReviews([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!rating) {
      Alert.alert('Оценка', 'Выберите оценку от 1 до 5 звёзд.');
      return;
    }
    if (!text.trim()) {
      Alert.alert('Отзыв', 'Напишите несколько слов.');
      return;
    }
    setSending(true);
    try {
      await reviewService.create({ rating, text });
      setRating(0);
      setText('');
      setSent(true);
    } catch (error) {
      Alert.alert('Не удалось отправить', apiErrorMessage(error, 'Попробуйте ещё раз.'));
    } finally {
      setSending(false);
    }
  };

  const form = (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Оставить отзыв</Text>
      {!user ? (
        <>
          <Text style={styles.muted}>Отзыв могут оставить только вошедшие пользователи.</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.buttonText}>Войти</Text>
          </TouchableOpacity>
        </>
      ) : sent ? (
        <>
          <Text style={styles.success}>Спасибо! Отзыв появится после проверки модератором.</Text>
          <TouchableOpacity onPress={() => setSent(false)}>
            <Text style={styles.link}>Написать ещё</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Stars value={rating} size={32} colors={colors} onChange={setRating} />
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Что понравилось, что улучшить?"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={REVIEW_TEXT_MAX}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.button, sending && styles.disabled]}
            onPress={submit}
            disabled={sending}
          >
            {sending ? <ActivityIndicator color={colors.buttonText} /> : <Text style={styles.buttonText}>Отправить</Text>}
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={reviews || []}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          colors={[colors.accent]}
        />
      }
      ListHeaderComponent={
        <>
          {form}
          <Text style={styles.sectionTitle}>Отзывы гостей</Text>
        </>
      }
      ListEmptyComponent={
        reviews === null ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Text style={styles.muted}>Отзывов пока нет — станьте первым.</Text>
        )
      }
      renderItem={({ item }) => (
        <View style={styles.review}>
          <View style={styles.reviewHead}>
            <Text style={styles.author}>{item.author}</Text>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('ru-RU')}</Text>
          </View>
          <Stars value={item.rating} size={14} colors={colors} />
          <Text style={styles.text}>{item.text}</Text>
        </View>
      )}
    />
  );
};

const makeStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 10 },
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      padding: 16,
      gap: 12,
      marginBottom: 6,
    },
    cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    input: {
      minHeight: 96,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.divider,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.bg,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
    },
    buttonText: { color: colors.buttonText, fontSize: 16, fontWeight: '700' },
    disabled: { opacity: 0.6 },
    success: { fontSize: 15, color: colors.accent, fontWeight: '600' },
    link: { fontSize: 14, color: colors.accent, textDecorationLine: 'underline' },
    muted: { fontSize: 14, color: colors.textMuted },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 6 },
    review: {
      backgroundColor: colors.cardBg,
      borderRadius: 14,
      padding: 14,
      gap: 6,
    },
    reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    author: { fontSize: 15, fontWeight: '700', color: colors.text },
    date: { fontSize: 13, color: colors.textMuted },
    text: { fontSize: 14, lineHeight: 20, color: colors.text },
  });

export default ReviewsScreen;
