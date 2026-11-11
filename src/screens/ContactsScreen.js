/**
 * Контакты из /contacts/: адреса и телефоны филиалов, Instagram.
 * Заменяет выдуманные номера, которые раньше были зашиты в профиле и в заказе.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '../components/ui/Icon';
import useAppTheme from '../theme/useAppTheme';
import { catalogService } from '../services';

export default function ContactsScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const [contacts, setContacts] = useState(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    try {
      setContacts(await catalogService.getContacts({ force }));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    catalogService
      .getContacts()
      .then(setContacts)
      .catch(() => setFailed(true));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  if (!contacts && !failed) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!contacts) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Не удалось загрузить контакты</Text>
        <TouchableOpacity style={styles.retry} onPress={() => load(true)}>
          <Text style={styles.retryText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {(contacts.branches ?? []).map((branch) => (
        <View key={branch.id} style={styles.card}>
          <Text style={styles.branchName}>{branch.name}</Text>
          <View style={styles.line}>
            <Icon name="location-on" size={18} color={colors.accent} />
            <Text style={styles.address}>{branch.address}</Text>
          </View>
          {(branch.phones ?? []).map((phone) => (
            <TouchableOpacity
              key={phone.dial}
              style={styles.line}
              onPress={() => Linking.openURL(`tel:${phone.dial}`)}
              accessibilityRole="button"
              accessibilityLabel={`Позвонить ${phone.number}`}
            >
              <Icon name="phone" size={18} color={colors.accent} />
              <Text style={styles.phone}>{phone.number}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {!!contacts.instagram_url && (
        <TouchableOpacity
          style={[styles.card, styles.line]}
          onPress={() => Linking.openURL(contacts.instagram_url)}
          accessibilityRole="link"
        >
          <Icon name="photo-camera" size={18} color={colors.accent} />
          <Text style={styles.phone}>Instagram</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 12 },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: colors.bg,
    },
    card: { padding: 16, gap: 10, borderRadius: 16, backgroundColor: colors.cardBg },
    branchName: { fontSize: 18, fontWeight: '700', color: colors.text },
    line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    address: { flex: 1, fontSize: 15, color: colors.text },
    phone: { fontSize: 16, fontWeight: '600', color: colors.accent },
    muted: { fontSize: 15, color: colors.textMuted },
    retry: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: colors.accent },
    retryText: { color: colors.buttonText, fontWeight: '600' },
  });
