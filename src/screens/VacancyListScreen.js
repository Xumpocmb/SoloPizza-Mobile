/**
 * Список вакансий (v1.1, 02.11.2026): GET /api/v1/vacancies/.
 * Карточка: фото, название, зарплата (null → «по договорённости»), льготы.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { vacancyService } from '../services';
import ProductImage from '../components/ui/ProductImage';
import useAppTheme from '../theme/useAppTheme';

const VacancyListScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const list = await vacancyService.getVacancies();
    setItems(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderVacancy = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('VacancyDetail', { vacancyId: item.id })}
    >
      <ProductImage uri={item.image} glyph={'💼'} style={styles.image} emojiSize={28} />
      <View style={styles.info}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.salary}>
          {item.salary ? `${item.salary} BYN` : 'Зарплата по договорённости'}
        </Text>
        {Array.isArray(item.benefits) && item.benefits.length > 0 && (
          <Text style={styles.benefits} numberOfLines={1}>
            {item.benefits.join(' · ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderVacancy}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>Сейчас открытых вакансий нет.</Text>
          <Text style={styles.emptySub}>Загляните позже или позвоните нам.</Text>
        </View>
      }
    />
  );
};

const makeStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    list: { padding: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    card: {
      flexDirection: 'row',
      backgroundColor: colors.cardBg,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.divider,
      padding: 12,
      marginBottom: 12,
    },
    image: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.bg },
    info: { flex: 1, marginLeft: 12, justifyContent: 'center' },
    title: { fontSize: 16, fontWeight: '700', color: colors.text },
    salary: { marginTop: 4, fontSize: 14, fontWeight: '600', color: colors.accent },
    benefits: { marginTop: 4, fontSize: 12, color: colors.textMuted },
    emptyText: { fontSize: 16, fontWeight: '600', color: colors.text },
    emptySub: { marginTop: 6, fontSize: 13, color: colors.textMuted },
  });

export default VacancyListScreen;
