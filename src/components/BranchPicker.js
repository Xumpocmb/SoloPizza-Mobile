/**
 * Выбор филиала (Ленина / Тексер). Меню, наличие и цены каталога зависят от
 * филиала (branch_id в каждом запросе), поэтому при смене корзина очищается —
 * с подтверждением, если в ней что-то есть.
 */
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Alert from '../utils/alertShim';
import Icon from './ui/Icon';
import useAppTheme from '../theme/useAppTheme';
import { fetchBranches, selectBranch } from '../store/slices/productSlice';

export default function BranchPicker() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const dispatch = useDispatch();
  const branches = useSelector((state) => state.products.branches);
  const branchId = useSelector((state) => state.products.branchId);
  const cartCount = useSelector((state) => state.cart.itemsCount);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchBranches());
  }, [dispatch]);

  if (branches.length < 2) return null; // выбирать не из чего

  const current = branches.find((b) => b.id === branchId);

  const choose = (branch) => {
    setOpen(false);
    if (branch.id === branchId) return;
    const apply = () => dispatch(selectBranch(branch.id));
    if (cartCount > 0) {
      Alert.alert(
        'Сменить филиал?',
        'Меню у филиалов разное, поэтому корзина будет очищена.',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Сменить', onPress: apply },
        ],
      );
    } else {
      apply();
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.row}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Филиал: ${current?.address ?? 'не выбран'}. Сменить`}
      >
        <Icon name="location-on" size={18} color={colors.accent} />
        <Text style={styles.rowText} numberOfLines={1}>
          {current ? current.address : 'Выберите филиал'}
        </Text>
        <Icon name="expand-more" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.title}>Выберите филиал</Text>
            {branches.map((branch) => {
              const active = branch.id === branchId;
              return (
                <TouchableOpacity
                  key={branch.id}
                  style={[styles.item, active && styles.itemActive]}
                  onPress={() => choose(branch)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{branch.name}</Text>
                    <Text style={styles.itemAddress}>{branch.address}</Text>
                  </View>
                  {active && <Icon name="check" size={22} color={colors.accent} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginHorizontal: 16,
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: colors.cardBg,
    },
    rowText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    backdrop: {
      flex: 1,
      justifyContent: 'center',
      padding: 24,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
      borderRadius: 16,
      padding: 16,
      gap: 8,
      backgroundColor: colors.cardBg,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 4,
      color: colors.text,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    itemActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentRgba,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    itemAddress: {
      fontSize: 14,
      marginTop: 2,
      color: colors.textMuted,
    },
  });
