import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useDispatch } from 'react-redux';
import Alert from '../utils/alertShim';
import ProductImage from '../components/ui/ProductImage';
import useAppTheme from '../theme/useAppTheme';
import { num } from '../utils/money';
import { addToCart } from '../store/slices/cartSlice';
import { productService } from '../services';
import {
  optionLabel,
  variantLabel,
  initialSelection,
  withVariant,
  toggleAddon,
  unitPrice,
  boardsAvailable,
  addonsAvailable,
  buildCartPayload,
} from '../utils/productOptions';

const MAX_QUANTITY = 10; // как на сайте (AddToCartForm)

const Chip = ({ styles, active, label, price, onPress }) => (
  <TouchableOpacity
    style={[styles.optionButton, active && styles.optionButtonActive]}
    onPress={onPress}
  >
    <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
    {num(price) > 0 && (
      <Text style={[styles.optionPrice, active && styles.optionPriceActive]}>
        +{num(price).toFixed(2)} BYN
      </Text>
    )}
  </TouchableOpacity>
);

const ProductDetailScreen = ({ route, navigation }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const { productId } = route.params;
  const dispatch = useDispatch();

  const [product, setProduct] = useState(null);
  const [selection, setSelection] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let active = true;
    productService
      .getProductDetail(productId)
      .then((data) => {
        if (!active) return;
        setProduct(data);
        setSelection(initialSelection(data));
      })
      .catch(() => {
        if (active) setProduct(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#079b59" />
        <Text style={styles.loadingText}>Загрузка товара...</Text>
      </View>
    );
  }

  if (!product || !selection?.variant) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Товар не найден</Text>
        <TouchableOpacity style={styles.addToCartButton} onPress={() => navigation.goBack()}>
          <Text style={styles.addToCartButtonText}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { variant } = selection;
  const variants = product.variants ?? [];
  const sauces = product.has_base_sauce ? product.sauces ?? [] : [];
  const drinks = product.has_drink ? product.drinks ?? [] : [];
  const total = unitPrice(selection) * quantity;

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      await dispatch(addToCart(buildCartPayload(product, selection, quantity))).unwrap();
      Alert.alert('Добавлено в корзину', `${product.name} — в корзине`, [
        { text: 'Продолжить покупки', style: 'cancel' },
        { text: 'Перейти в корзину', onPress: () => navigation.navigate('Cart') },
      ]);
    } catch (message) {
      // сервер объясняет, что не так: товар не в этом филиале, борт не того размера и т.п.
      Alert.alert('Не удалось добавить', String(message));
    } finally {
      setAdding(false);
    }
  };

  // Два борта, как на сайте: оба необязательные и не могут совпадать
  const renderBoardRow = (slot, otherSlot, title) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.optionsContainer}>
        <Chip
          styles={styles}
          label="Без борта"
          active={!selection[slot]}
          onPress={() => setSelection({ ...selection, [slot]: null })}
        />
        {variant.boards
          .filter((board) => board.id !== selection[otherSlot]?.id)
          .map((board) => (
            <Chip
              key={board.id}
              styles={styles}
              label={optionLabel(board.name)}
              price={board.price}
              active={selection[slot]?.id === board.id}
              onPress={() => setSelection({ ...selection, [slot]: board })}
            />
          ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ProductImage uri={product.image} style={styles.productImage} emojiSize={72} />

        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          {!!product.description && (
            <Text style={styles.productDescription}>{product.description}</Text>
          )}
        </View>

        {variants.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{variant.size ? 'Размер' : 'Вариант'}</Text>
            <View style={styles.optionsContainer}>
              {variants.map((v) => (
                <Chip
                  key={v.id}
                  styles={styles}
                  label={`${variantLabel(v)} — ${num(v.price).toFixed(2)} BYN`}
                  active={variant.id === v.id}
                  onPress={() => setSelection(withVariant(selection, v))}
                />
              ))}
            </View>
          </View>
        )}

        {sauces.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Соус-основа</Text>
            <View style={styles.optionsContainer}>
              {sauces.map((sauce) => (
                <Chip
                  key={sauce.id}
                  styles={styles}
                  label={sauce.name}
                  active={selection.sauce?.id === sauce.id}
                  onPress={() => setSelection({ ...selection, sauce })}
                />
              ))}
            </View>
          </View>
        )}

        {boardsAvailable(product, variant) && (
          <>
            {renderBoardRow('board1', 'board2', 'Первый борт')}
            {renderBoardRow('board2', 'board1', 'Второй борт')}
          </>
        )}

        {addonsAvailable(product, variant) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Добавки</Text>
            <View style={styles.addonsContainer}>
              {variant.addons.map((addon) => {
                const isSelected = selection.addons.some((a) => a.id === addon.id);
                return (
                  <TouchableOpacity
                    key={addon.id}
                    style={[styles.addonItem, isSelected && styles.addonItemActive]}
                    onPress={() => setSelection(toggleAddon(selection, addon))}
                  >
                    <View style={styles.addonInfo}>
                      <Text style={[styles.addonName, isSelected && styles.addonNameActive]}>
                        {optionLabel(addon.name)}
                      </Text>
                      <Text style={[styles.addonPrice, isSelected && styles.addonPriceActive]}>
                        +{num(addon.price).toFixed(2)} BYN
                      </Text>
                    </View>
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {drinks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Напиток</Text>
            <View style={styles.optionsContainer}>
              {drinks.map((drink) => (
                <Chip
                  key={drink.id}
                  styles={styles}
                  label={drink.name}
                  active={selection.drink?.id === drink.id}
                  onPress={() => setSelection({ ...selection, drink })}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Количество</Text>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(quantity - 1)}
              disabled={quantity <= 1}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(quantity + 1)}
              disabled={quantity >= MAX_QUANTITY}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomPanel}>
        <View style={styles.priceContainer}>
          <Text style={styles.totalPriceLabel}>Итого:</Text>
          <Text style={styles.totalPrice}>{total.toFixed(2)} BYN</Text>
        </View>
        <TouchableOpacity
          style={[styles.addToCartButton, adding && { opacity: 0.6 }]}
          onPress={handleAddToCart}
          disabled={adding}
        >
          <Text style={styles.addToCartButtonText}>{adding ? 'Добавляем…' : 'Добавить в корзину'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    paddingHorizontal: 20,
  },
  errorText: {
     marginTop: 16,
     fontSize: 18,
     color: colors.textMuted,
     textAlign: 'center',
   },
  scrollView: {
    flex: 1,
  },
  productImage: {
    width: '100%',
    height: 300,
  },
  productInfo: {
    padding: 24,
    backgroundColor: colors.cardBg,
    marginBottom: 8,
  },
  productName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    lineHeight: 34,
  },
  productDescription: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
    marginBottom: 16,
  },
  basePrice: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.accent,
  },
  section: {
    backgroundColor: colors.cardBg,
    marginBottom: 8,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    backgroundColor: colors.cardBg,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.divider,
    minWidth: 90,
    alignItems: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  optionTextActive: {
    color: colors.buttonText,
  },
  optionPrice: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  optionPriceActive: {
    color: colors.buttonText,
  },
  addonsContainer: {
    gap: 12,
  },
  addonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.divider,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addonItemActive: {
    backgroundColor: colors.accentRgba,
    borderColor: colors.accent,
  },
  addonInfo: {
    flex: 1,
  },
  addonName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  addonNameActive: {
    color: colors.text,
  },
  addonPrice: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  addonPriceActive: {
    color: colors.accent,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.divider,
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkmark: {
    color: colors.buttonText,
    fontSize: 14,
    fontWeight: 'bold',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  quantityButtonText: {
    color: colors.buttonText,
    fontSize: 20,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  nutritionContainer: {
    gap: 16,
  },
  nutritionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  nutritionLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
  },
  bottomPanel: {
    backgroundColor: colors.cardBg,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalPriceLabel: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '500',
  },
  totalPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.accent,
  },
  addToCartButton: {
    backgroundColor: colors.accent,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addToCartButtonText: {
    color: colors.buttonText,
    fontSize: 18,
    fontWeight: '700',
  },
});

export default ProductDetailScreen;