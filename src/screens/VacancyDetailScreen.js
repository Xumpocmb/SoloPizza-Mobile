/**
 * Деталь вакансии (v1.1): GET /api/v1/vacancies/<id>/ + вход в форму отклика.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { vacancyService } from '../services';
import ProductImage from '../components/ui/ProductImage';
import useAppTheme from '../theme/useAppTheme';

const VacancyDetailScreen = ({ route, navigation }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const vacancyId = route.params?.vacancyId;
  const [vacancy, setVacancy] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await vacancyService.getVacancy(vacancyId);
        if (alive) setVacancy(data);
      } catch (error) {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [vacancyId]);

  if (failed) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={styles.emptyText}>Вакансия недоступна или уже закрыта.</Text>
      </View>
    );
  }

  if (!vacancy) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ProductImage uri={vacancy.image} glyph={'💼'} style={styles.hero} emojiSize={48} />
      <View style={styles.body}>
        <Text style={styles.title}>{vacancy.title}</Text>
        <Text style={styles.salary}>
          {vacancy.salary ? `${vacancy.salary} BYN` : 'Зарплата по договорённости'}
        </Text>
        {Array.isArray(vacancy.benefits) && vacancy.benefits.length > 0 && (
          <View style={styles.benefits}>
            <Text style={styles.sectionTitle}>Что мы предлагаем</Text>
            {vacancy.benefits.map((benefit, index) => (
              <Text key={index} style={styles.benefitRow}>• {benefit}</Text>
            ))}
          </View>
        )}
        {vacancy.description ? (
          <View style={styles.descriptionBlock}>
            <Text style={styles.sectionTitle}>О вакансии</Text>
            <Text style={styles.description}>{vacancy.description}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.applyButton}
          onPress={() =>
            navigation.navigate('VacancyApply', {
              vacancyId,
              title: vacancy.title,
            })
          }
        >
          <Text style={styles.applyText}>Откликнуться</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const makeStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    hero: { width: '100%', height: 200, backgroundColor: colors.cardBg },
    body: { padding: 16 },
    title: { fontSize: 22, fontWeight: '800', color: colors.text },
    salary: { marginTop: 6, fontSize: 16, fontWeight: '700', color: colors.accent },
    benefits: { marginTop: 16 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
    benefitRow: { fontSize: 14, color: colors.textMuted, marginBottom: 4 },
    descriptionBlock: { marginTop: 16 },
    description: { fontSize: 14, lineHeight: 21, color: colors.textMuted },
    applyButton: {
      marginTop: 24,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    applyText: { color: colors.buttonText, fontSize: 16, fontWeight: '700' },
    emptyText: { fontSize: 16, fontWeight: '600', color: colors.text },
  });

export default VacancyDetailScreen;
