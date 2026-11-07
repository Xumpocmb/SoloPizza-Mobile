import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Alert from '../utils/alertShim';
import ProductImage from '../components/ui/ProductImage';
import useAppTheme from '../theme/useAppTheme';
import { num } from '../utils/money';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductById } from '../store/slices/productSlice';
import { addToCart } from '../store/slices/cartSlice';
import { productService } from '../services';

const { width } = Dimensions.get('window');

const ProductDetailScreen = ({ route, navigation }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const { productId, product: routeProduct } = route.params;
  const dispatch = useDispatch();
  const { currentProduct, loading: reduxLoading } = useSelector(state => state.products);
  const { user } = useSelector(state => state.auth);

  const [product, setProduct] = useState(routeProduct || currentProduct);
  const [loading, setLoading] = useState(!routeProduct && !currentProduct);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [sizes, setSizes] = useState([]);
  const [toppings, setToppings] = useState([]);

  const loadProductDetail = async () => {
    try {
      setLoading(true);
      const productData = await productService.getProductDetail(productId);
      setProduct(productData);
      loadProductOptions(productData);
    } catch (error) {
      console.error('Error loading product detail:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить информацию о товаре');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadProductOptions = async (productData = product) => {
    try {
      // Load sizes and toppings for the product
      if (productData?.category === 'pizza' || productData?.category_name === 'Пицца') {
        const [sizesData, toppingsData] = await Promise.all([
          productService.getProductSizes(productData.id),
          productService.getProductToppings(productData.id)
        ]);
        
        setSizes(sizesData || []);
        setToppings(toppingsData || []);
        
        // Set default size
        if (sizesData && sizesData.length > 0) {
          setSelectedSize(sizesData.find(s => s.is_default) || sizesData[0]);
        }
      }
    } catch (error) {
      console.error('Error loading product options:', error);
      // Fallback to mock data
      setSizes([
        { id: 1, name: 'Маленькая', size: '25 см', price: 0 },
        { id: 2, name: 'Средняя', size: '30 см', price: 200 },
        { id: 3, name: 'Большая', size: '35 см', price: 400 },
      ]);
      
      setToppings([
        { id: 1, name: 'Дополнительный сыр', price: 150 },
        { id: 2, name: 'Пепперони', price: 200 },
        { id: 3, name: 'Грибы', price: 100 },
        { id: 4, name: 'Оливки', price: 120 },
        { id: 5, name: 'Томаты', price: 80 },
        { id: 6, name: 'Болгарский перец', price: 90 },
      ]);
    }
  };

  useEffect(() => {
    if (productId && !routeProduct) {
      if (currentProduct && currentProduct.id === productId) {
        setProduct(currentProduct);
        setLoading(false);
        loadProductOptions(currentProduct);
      } else {
        dispatch(fetchProductById(productId));
        loadProductDetail();
      }
    } else if (routeProduct) {
      loadProductOptions(routeProduct);
    }
  }, [productId, routeProduct, currentProduct, dispatch]);

  useEffect(() => {
    // Update product from Redux if it changes
    if (currentProduct && currentProduct.id === productId && !routeProduct) {
      setProduct(currentProduct);
      setLoading(reduxLoading);
    }
  }, [currentProduct, reduxLoading, productId, routeProduct]);

  useEffect(() => {
    // Устанавливаем размер по умолчанию
    if (sizes.length > 0 && !selectedSize) {
      setSelectedSize(sizes[0]);
    }
  }, [sizes]);

  useEffect(() => {
    // Пересчитываем общую стоимость
    if (product && selectedSize) {
      const basePrice = num(product.price ?? product.base_price);
      const sizePrice = num(selectedSize?.price);
      const toppingsPrice = selectedToppings.reduce((sum, topping) => sum + num(topping.price), 0);
      setTotalPrice((basePrice + sizePrice + toppingsPrice) * quantity);
    }
  }, [product, selectedSize, selectedToppings, quantity]);

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
  };

  const handleToppingToggle = (topping) => {
    const isSelected = selectedToppings.find(t => t.id === topping.id);
    if (isSelected) {
      setSelectedToppings(selectedToppings.filter(t => t.id !== topping.id));
    } else {
      setSelectedToppings([...selectedToppings, topping]);
    }
  };

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    if (!product || !selectedSize) {
      Alert.alert('Ошибка', 'Пожалуйста, выберите размер');
      return;
    }

    const cartItem = {
      id: `${product.id}_${selectedSize.id}_${selectedToppings.map(t => t.id).join('_')}`,
      productId: product.id,
      name: product.name,
      image: product.image || product.images?.[0]?.image,
      price: num(totalPrice) / quantity,
      quantity: quantity,
      size: selectedSize,
      toppings: selectedToppings,
    };

    dispatch(addToCart(cartItem));
    Alert.alert(
      'Добавлено в корзину',
      `${product.name} добавлена в корзину`,
      [
        { text: 'Продолжить покупки', style: 'cancel' },
        { text: 'Перейти в корзину', onPress: () => navigation.navigate('Cart') },
      ]
    );
  };

  const renderSizeSelector = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Размер</Text>
        <View style={styles.optionsContainer}>
          {sizes.map((size) => (
            <TouchableOpacity
              key={size.id}
              style={[
                styles.optionButton,
                selectedSize?.id === size.id && styles.optionButtonActive,
              ]}
              onPress={() => handleSizeSelect(size)}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedSize?.id === size.id && styles.optionTextActive,
                ]}
              >
                {size.name} ({size.size})
              </Text>
              {size.price > 0 && (
                <Text
                  style={[
                    styles.optionPrice,
                    selectedSize?.id === size.id && styles.optionPriceActive,
                  ]}
                >
                  +{size.price} BYN
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderToppingsSelector = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Добавки</Text>
        <View style={styles.addonsContainer}>
          {toppings.map((topping) => {
            const isSelected = selectedToppings.find(item => item.id === topping.id);
            return (
              <TouchableOpacity
                key={topping.id}
                style={[
                  styles.addonItem,
                  isSelected && styles.addonItemActive,
                ]}
                onPress={() => handleToppingToggle(topping)}
              >
                <View style={styles.addonInfo}>
                  <Text
                    style={[
                      styles.addonName,
                      isSelected && styles.addonNameActive,
                    ]}
                  >
                    {topping.name}
                  </Text>
                  <Text
                    style={[
                      styles.addonPrice,
                      isSelected && styles.addonPriceActive,
                    ]}
                  >
                    +{topping.price} BYN
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    isSelected && styles.checkboxActive,
                  ]}
                >
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#079b59" />
        <Text style={styles.loadingText}>Загрузка товара...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Товар не найден</Text>
        <TouchableOpacity 
          style={styles.addToCartButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.addToCartButtonText}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Изображение товара */}
        <ProductImage
          uri={product.image || product.images?.[0]?.image}
          style={styles.productImage}
          emojiSize={72}
        />

        {/* Информация о товаре */}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productDescription}>
            {product.description}
          </Text>
          <Text style={styles.basePrice}>
            Базовая цена: {num(product.price ?? product.base_price).toFixed(2)} BYN
          </Text>
        </View>

        {/* Селектор размера */}
        {renderSizeSelector()}

        {/* Селектор добавок */}
        {renderToppingsSelector()}

        {/* Количество */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Количество</Text>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleQuantityChange(1)}
              disabled={quantity >= 99}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Пищевая ценность */}
        {product.nutrition && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Пищевая ценность</Text>
            <View style={styles.nutritionContainer}>
              {product.nutrition.calories && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Калории:</Text>
                  <Text style={styles.nutritionValue}>
                    {product.nutrition.calories} ккал
                  </Text>
                </View>
              )}
              {product.nutrition.proteins && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Белки:</Text>
                  <Text style={styles.nutritionValue}>
                    {product.nutrition.proteins} г
                  </Text>
                </View>
              )}
              {product.nutrition.fats && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Жиры:</Text>
                  <Text style={styles.nutritionValue}>
                    {product.nutrition.fats} г
                  </Text>
                </View>
              )}
              {product.nutrition.carbohydrates && (
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Углеводы:</Text>
                  <Text style={styles.nutritionValue}>
                    {product.nutrition.carbohydrates} г
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Нижняя панель с ценой и кнопкой */}
      <View style={styles.bottomPanel}>
        <View style={styles.priceContainer}>
          <Text style={styles.totalPriceLabel}>Итого:</Text>
          <Text style={styles.totalPrice}>{num(totalPrice).toFixed(2)} BYN</Text>
        </View>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={handleAddToCart}
        >
          <Text style={styles.addToCartButtonText}>Добавить в корзину</Text>
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
    backgroundColor: colors.errorRgba,
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
    color: colors.accent,
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