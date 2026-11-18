import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { num } from '../utils/money';
import ProductImage from '../components/ui/ProductImage';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts, fetchCategories } from '../store/slices/productSlice';
import { SafeAreaView } from 'react-native-safe-area-context';
import DemoBanner from '../components/ui/DemoBanner';
import BranchPicker from '../components/BranchPicker';
import useAppTheme from '../theme/useAppTheme';

/**
 * Каталог — один список всех товаров, разделённый на категории (как якоря на странице):
 * чип прокручивает к разделу, при листании подсвечивается чип текущего раздела.
 * Разделы строятся по полю category (slug) из /products/; у старого сервера его нет —
 * тогда список без заголовков, чипы скрыты.
 */
export const buildRows = (products, categories) => {
  const rows = [];
  const headerIndex = {};
  const bySlug = {};
  products.forEach((product) => {
    (bySlug[product.category] = bySlug[product.category] || []).push(product);
  });
  const known = new Set(categories.map((c) => c.slug));
  const pushItems = (items, category) => {
    for (let i = 0; i < items.length; i += 2) {
      rows.push({ key: `r${items[i].id}`, type: 'row', category, items: items.slice(i, i + 2) });
    }
  };
  categories.forEach((category) => {
    const items = bySlug[category.slug];
    if (!items?.length) return;
    headerIndex[category.id] = rows.length;
    rows.push({ key: `h${category.id}`, type: 'header', category });
    pushItems(items, category);
  });
  // товары без известной категории (или старый сервер без поля category) — в конце, без заголовка
  pushItems(products.filter((product) => !known.has(product.category)), null);
  return { rows, headerIndex };
};

const CatalogScreen = ({ navigation, route }) => {
  const { colors } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const styles = makeStyles(colors);
  const dispatch = useDispatch();
  const { products, categories, loading, error, branchId } = useSelector((state) => state.products);

  const [refreshing, setRefreshing] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const listRef = useRef(null);
  const categoriesRef = useRef(null);
  const chipLayouts = useRef({});
  const retries = useRef(0);

  const { rows, headerIndex } = useMemo(() => buildRows(products, categories), [products, categories]);
  const chips = categories.filter((category) => headerIndex[category.id] != null);

  const loadData = async (force = false) => {
    try {
      // весь каталог одним запросом: разделы делим в приложении по category
      await Promise.all([dispatch(fetchCategories(force)).unwrap(), dispatch(fetchProducts({ force })).unwrap()]);
    } catch (loadError) {
      console.error('Ошибка загрузки данных:', loadError);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // pull-to-refresh обходит тёплый кэш (дефект №2)
    await loadData(true);
    setRefreshing(false);
  };

  // Меню зависит от филиала: при смене перезагружаем каталог
  useEffect(() => {
    loadData();
  }, [branchId]);

  // активный чип — по центру ряда. Ряд — ScrollView: в FlatList onLayout чипа даёт x внутри ячейки (0)
  const centerChip = (id) => {
    const layout = chipLayouts.current[id];
    if (!layout || !categoriesRef.current) return;
    const x = Math.max(0, layout.x - (windowWidth - layout.width) / 2);
    categoriesRef.current.scrollTo({ x, animated: true });
  };
  useEffect(() => {
    if (activeId != null) centerChip(activeId);
  }, [activeId]);

  const scrollToCategory = (id) => {
    const index = headerIndex[id];
    if (index == null) return false;
    setActiveId(id);
    retries.current = 0;
    listRef.current?.scrollToIndex({ index, animated: true });
    return true;
  };

  // при листании активен раздел первой видимой строки
  // FlatList требует неизменную функцию: пустые зависимости, setActiveId стабилен
  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    const first = viewableItems.find((viewable) => viewable.item.category);
    if (first) setActiveId(first.item.category.id);
  }, []);

  // категория с главной (id) или 'all' из пустой корзины — ждём, пока появятся разделы
  const requestedCategoryId = route?.params?.categoryId;
  useEffect(() => {
    if (requestedCategoryId == null || !rows.length) return;
    if (requestedCategoryId === 'all') listRef.current?.scrollToOffset({ offset: 0, animated: false });
    else scrollToCategory(requestedCategoryId);
    navigation.setParams({ categoryId: undefined });
  }, [requestedCategoryId, rows.length]);

  const renderProduct = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <ProductImage uri={item.image || item.main_image || item.images?.[0]?.image} style={styles.productImage} />
      {(item.is_popular || item.isPopular) && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Популярное</Text>
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description || item.short_description || 'Описание товара'}
        </Text>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>{num(item.price ?? item.base_price).toFixed(2)} BYN</Text>
          {/* размер, соус и добавки выбираются в карточке: без варианта заказ не оформить */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRow = ({ item: row }) =>
    row.type === 'header' ? (
      <Text style={styles.sectionHeader}>{row.category.name}</Text>
    ) : (
      <View style={styles.productRow}>
        {row.items.map(renderProduct)}
        {row.items.length === 1 && <View style={styles.productSpacer} />}
      </View>
    );

  // на весь экран — только первая загрузка
  if (loading && !refreshing && !products.length) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#079b59" />
        <Text style={styles.loadingText}>Загрузка каталога...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Ошибка загрузки каталога</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadData()}>
          <Text style={styles.retryButtonText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    // edges top: контент не уходит под строку состояния (Android рисует приложение во весь экран)
    <SafeAreaView style={styles.container} edges={['top']}>
      <DemoBanner />
      <BranchPicker />

      {chips.length > 0 && (
        <View style={styles.categoriesContainer}>
          <ScrollView
            ref={categoriesRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          >
            {chips.map((category) => {
              const active = activeId === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryItem, active && styles.selectedCategory]}
                  onPress={() => scrollToCategory(category.id)}
                  onLayout={(event) => {
                    chipLayouts.current[category.id] = event.nativeEvent.layout;
                  }}
                >
                  <Text style={[styles.categoryText, active && styles.selectedCategoryText]}>{category.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={rows}
        renderItem={renderRow}
        keyExtractor={(row) => row.key}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        // строка ещё не отрисована (высота неизвестна): прыжок по средней высоте, затем повтор —
        // по мере отрисовки строк высоты уточняются и прокрутка встаёт точно (до 6 попыток)
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
          if (retries.current >= 6) return;
          retries.current += 1;
          setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false }), 80);
        }}
        // 02.11.2026: тяжёлые медиа сайта (png 200–400 kB) — держим окно
        // виртуализации узким, чтобы офскрин-карточки не тянули картинки
        // сразу; на веб ленивость даёт loading="lazy" в ProductImage
        windowSize={9}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        removeClippedSubviews={Platform.OS !== 'web'}
        contentContainerStyle={styles.productsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Товары не найдены</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  categoriesContainer: {
    backgroundColor: colors.cardBg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  categoriesList: {
    paddingHorizontal: 15,
  },
  categoryItem: {
    backgroundColor: colors.bg,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  selectedCategory: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: colors.buttonText,
  },
  productsList: {
    padding: 15,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 14,
    marginBottom: 6,
    marginHorizontal: 5,
  },
  productRow: {
    flexDirection: 'row',
  },
  productSpacer: {
    flex: 1,
    margin: 5,
  },
  productCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    margin: 5,
    shadowColor: colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  productImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
    lineHeight: 16,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
  addButton: {
    backgroundColor: colors.accent,
    width: 30,
    height: 30,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.buttonText,
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  popularText: {
    color: colors.buttonText,
    fontSize: 10,
    fontWeight: '600',
  },
});

export default CatalogScreen;