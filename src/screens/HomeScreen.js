import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import Icon from '../components/ui/Icon';
import OfflineNotice from '../components/ui/OfflineNotice';
import ProductImage, { CATEGORY_GLYPHS } from '../components/ui/ProductImage';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFeaturedProducts, fetchCategories } from '../store/slices/productSlice';
import { catalogService, productService, promoService, vacancyService } from '../services';
import { SafeAreaView } from 'react-native-safe-area-context';
import BranchPicker from '../components/BranchPicker';
import PromoCarousel from '../components/PromoCarousel';
import useAppTheme from '../theme/useAppTheme';
import { num } from '../utils/money';
import { HOME_SLIDER_ENABLED } from '../config/api';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const dispatch = useDispatch();
  const { featuredProducts, categories, loading, branchId } = useSelector(state => state.products);
  
  const [refreshing, setRefreshing] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [apiCategories, setApiCategories] = useState([]);
  const [apiProducts, setApiProducts] = useState([]);
  const [weekly, setWeekly] = useState(null);
  const [vacancies, setVacancies] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [banners, setBanners] = useState([
    {
      id: 1,
      title: 'Скидка 20%',
      subtitle: 'На все пиццы до конца недели',
      backgroundColor: colors.accent,
    },
    {
      id: 2,
      title: 'Новинка!',
      subtitle: 'Попробуйте нашу новую пиццу "Четыре сыра"',
      backgroundColor: colors.success,
    },
    {
      id: 3,
      title: 'Быстрая доставка',
      subtitle: 'Доставим за 30 минут или пицца бесплатно',
      backgroundColor: colors.accent,
    },
  ]);



  const [offline, setOffline] = useState(false);

  const loadApiData = async (force = false) => {
    try {
      const [categoriesData, productsData, promosData, weeklyData, vacanciesData, announcementsData] = await Promise.all([
        catalogService.getCategories({ force }),
        productService.getPopularProducts({ limit: 6, force }),
        HOME_SLIDER_ENABLED ? promoService.getActivePromos() : [],
        // v1.1: блюдо недели — один объект или null (блока просто нет)
        catalogService.getWeeklySpecial({ force }),
        // v1.1: вакансии — блок главной страницы, как на сайте друга
        vacancyService.getVacancies(),
        // объявления из админки сайта (бывшая бегущая строка); пусто — блока нет
        catalogService.getAnnouncements({ force }),
      ]);
      setWeekly(weeklyData || null);
      setVacancies(Array.isArray(vacanciesData) ? vacanciesData : []);
      setAnnouncements(announcementsData);
      
      setApiCategories(categoriesData.results || categoriesData || []);
      setApiProducts(productsData.results || productsData || []);
      
      // Update banners with API data if available
      if (promosData && promosData.length > 0) {
        const apiBanners = promosData.map(promo => ({
          id: promo.id,
          title: promo.title,
          subtitle: promo.description || promo.subtitle,
          backgroundColor: promo.background_color || colors.accent,
        }));
        setBanners(apiBanners);
      }
      setOffline(false);
    } catch (error) {
      // нет сети (status 0) — вместо пустой главной сообщение «Нет подключения к интернету»
      setOffline(error?.status === 0);
      if (error?.status !== 0) console.error('Error loading API data:', error);
    }
  };

  // Instagram и реквизиты компании (как в футере сайта) — из /contacts/
  const [contacts, setContacts] = useState(null);
  const branchContacts = contacts?.branches?.find((b) => b.id === branchId) ?? null;
  useEffect(() => {
    catalogService.getContacts().then(setContacts).catch(() => setContacts(null));
  }, []);

  useEffect(() => {
    if (!HOME_SLIDER_ENABLED) return undefined;
    // Автоматическая смена баннеров
    const interval = setInterval(() => {
      setBannerIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [banners.length]);

  // 02.11.2026: force=true только для pull-to-refresh — обычный монтаж экрана
  // берёт тёплый кэш каталога и не дублирует запросы (дефект №2)
  const loadData = async (force = false) => {
    try {
      await Promise.all([
        dispatch(fetchFeaturedProducts({ force })).unwrap(),
        dispatch(fetchCategories(force)).unwrap()
      ]);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(true), loadApiData(true)]);
    setRefreshing(false);
  };

  // Размер, соус и добавки выбираются в карточке: без варианта заказ не оформить
  const handleAddToCart = (product) => {
    navigation.navigate('ProductDetail', { productId: product.id });
  };

  const navigateToCategory = (category) => {
    // параметры — экрану каталога внутри вкладки, а не самой вкладке
    navigation.navigate('Catalog', { screen: 'CatalogMain', params: { categoryId: category.id } });
  };

  const navigateToAllProducts = () => {
    navigation.navigate('Catalog');
  };

  const renderFeaturedProduct = ({ item }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <ProductImage 
        uri={item.image || item.main_image || item.images?.[0]?.image} 
        style={styles.productImage}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description || item.short_description}
        </Text>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>
            {num(item.price ?? item.base_price).toFixed(2)} BYN
          </Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => handleAddToCart(item)}
          >
            <Icon name="add-shopping-cart" size={14} color={colors.buttonText} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => navigateToCategory(item)}
    >
      <ProductImage
        uri={item.image}
        glyph={CATEGORY_GLYPHS[item.slug] || '🍽'}
        style={styles.categoryImage}
        emojiSize={32}
      />
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  // Меню зависит от филиала: при смене перезагружаем главную
  useEffect(() => {
    loadData();
    loadApiData();
  }, [branchId]);

  if (offline) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <OfflineNotice onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  if (loading && !featuredProducts?.length && !categories?.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#079b59" />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    // edges top: контент не уходит под строку состояния (Android рисует приложение во весь экран)
    <SafeAreaView style={styles.container} edges={['top']}>
    {/* филиал закреплён сверху: при прокрутке остаётся на месте, как в каталоге */}
    <BranchPicker />
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {announcements.map((item) => (
        <View key={item.id} style={styles.announcement}>
          <Text style={styles.announcementText}>{item.text}</Text>
        </View>
      ))}

      {/* Меню (категории) — первым блоком, над «Новинками» */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Меню</Text>
          <TouchableOpacity onPress={navigateToAllProducts}>
            <Text style={styles.seeAllText}>Все товары</Text>
          </TouchableOpacity>
        </View>
        
        {(apiCategories?.length > 0 ? apiCategories : categories)?.length > 0 ? (
          <FlatList
            data={apiCategories?.length > 0 ? apiCategories : categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        ) : (
          <Text style={styles.emptyText}>Категории не найдены</Text>
        )}
      </View>

      {/* Featured Products Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Новинки</Text>
          <TouchableOpacity onPress={navigateToAllProducts}>
            <Text style={styles.seeAllText}>Все</Text>
          </TouchableOpacity>
        </View>
        
        {(apiProducts?.length > 0 ? apiProducts : featuredProducts)?.length > 0 ? (
          <FlatList
            data={(apiProducts?.length > 0 ? apiProducts : featuredProducts).slice(0, 6)}
            renderItem={renderFeaturedProduct}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productsList}
          />
        ) : (
          <Text style={styles.emptyText}>Товары не найдены</Text>
        )}
      </View>

      {/* Акции, как на сайте /discounts/: первая карточка — пицца недели */}
      <PromoCarousel
        weekly={weekly}
        onOpenProduct={(product) => navigation.navigate('ProductDetail', { productId: product.id })}
        onOpenCatalog={navigateToAllProducts}
      />

      {/* Banner Carousel — выключен флагом HOME_SLIDER_ENABLED (config/api.js) */}
      {HOME_SLIDER_ENABLED && (
      <View style={styles.bannerContainer}>
        <View style={[styles.banner, { backgroundColor: banners[bannerIndex].backgroundColor }]}>
          <Text style={styles.bannerTitle}>{banners[bannerIndex].title}</Text>
          <Text style={styles.bannerSubtitle}>{banners[bannerIndex].subtitle}</Text>
        </View>
        <View style={styles.bannerIndicators}>
          {banners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                { opacity: index === bannerIndex ? 1 : 0.3 }
              ]}
            />
          ))}
        </View>
      </View>
      )}


      {/* Вакансии (v1.1): блок главной, вход в список — «Все вакансии» */}
      {vacancies.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Вакансии</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Vacancies')}>
              <Text style={styles.seeAllText}>Все вакансии</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={vacancies.slice(0, 5)}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.vacancyCard}
                onPress={() => navigation.navigate('VacancyDetail', { vacancyId: item.id })}
              >
                <Text style={styles.vacancyTitle}>{item.title}</Text>
                <Text style={styles.vacancySalary}>
                  {item.salary ? `${item.salary} BYN` : 'по договорённости'}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
      {/* Книга замечаний и предложений — как solo-pizza.by/reviews/ */}
      <View style={styles.section}>
        <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>Книга замечаний и предложений</Text>
          <Text style={styles.reviewText}>Расскажите, что понравилось и что нам улучшить.</Text>
          <TouchableOpacity style={styles.reviewButton} onPress={() => navigation.navigate('Reviews')}>
            <Text style={styles.reviewButtonText}>Оставить отзыв</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* В самом конце — как футер сайта: Instagram, реквизиты, © */}
      <View style={styles.footer}>
        {/* контакты выбранного вверху филиала; номера — звонок по нажатию */}
        {!!branchContacts && (
          <View style={styles.contacts}>
            <Text style={styles.contactsTitle}>Контакты</Text>
            {(branchContacts.phones ?? []).map((phone) => (
              <TouchableOpacity
                key={phone.dial}
                onPress={() => Linking.openURL(`tel:${phone.dial}`)}
                accessibilityRole="link"
                accessibilityLabel={`Позвонить ${phone.number}`}
              >
                <Text style={styles.contactsPhone}>{phone.number}</Text>
              </TouchableOpacity>
            ))}
            {!!branchContacts.address && <Text style={styles.contactsAddress}>{branchContacts.address}</Text>}
          </View>
        )}
        {!!contacts?.instagram_url && (
          <TouchableOpacity
            style={styles.instagram}
            onPress={() => Linking.openURL(contacts.instagram_url)}
            accessibilityRole="link"
          >
            <Icon name="photo-camera" size={20} color={colors.accent} />
            <Text style={styles.instagramText}>Мы в Instagram</Text>
          </TouchableOpacity>
        )}
        {!!contacts?.company && (
          <View style={styles.company}>
            <Text style={styles.companyText}>{contacts.company.legal_name}</Text>
            {!!contacts.company.unpp && <Text style={styles.companyText}>УНП: {contacts.company.unpp}</Text>}
            {!!contacts.company.address && <Text style={styles.companyText}>{contacts.company.address}</Text>}
            {!!contacts.company.bank_name && (
              <Text style={styles.companyText}>
                Банк: {contacts.company.bank_name}
                {contacts.company.bank_bik ? ` (БИК: ${contacts.company.bank_bik})` : ''}
                {contacts.company.account_number ? ` / Р/с: ${contacts.company.account_number}` : ''}
              </Text>
            )}
          </View>
        )}
        <Text style={styles.companyText}>© {new Date().getFullYear()} Solo Pizza. Все права защищены.</Text>
      </View>

    </ScrollView>
    </SafeAreaView>
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
    backgroundColor: colors.bg,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textMuted,
  },
  bannerContainer: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  banner: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.buttonText,
    textAlign: 'center',
    marginBottom: 5,
  },
  bannerSubtitle: {
    fontSize: 16,
    color: colors.buttonText,
    textAlign: 'center',
  },
  bannerIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cardBg,
    marginHorizontal: 4,
  },
  announcement: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.accentRgba,
  },
  announcementText: {
    fontSize: 15,
    color: colors.text,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  footer: {
    marginHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  contacts: {
    alignItems: 'center',
    gap: 6,
  },
  contactsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 2,
  },
  contactsPhone: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
  },
  contactsAddress: {
    fontSize: 14,
    color: colors.text,
  },
  instagram: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 14,
  },
  instagramText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  company: {
    gap: 2,
  },
  companyText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    textAlign: 'center',
  },
  reviewCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 16,
    gap: 8,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  reviewText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  reviewButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  reviewButtonText: {
    color: colors.buttonText,
    fontSize: 15,
    fontWeight: '700',
  },
  vacancyCard: {
    width: 200,
    marginRight: 12,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 14,
  },
  vacancyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  vacancySalary: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  seeAllText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  categoriesList: {
    paddingLeft: 5,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 15,
    width: 80,
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.cardBg,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  productsList: {
    paddingVertical: 4, // место под тень карточек сверху и снизу
  },
  productCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    marginRight: 15,
    width: 160,
    elevation: 3,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  // фото квадратные (1:1): квадрат со скруглением, чуть ниже верхнего края карточки
  productImage: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginTop: 10,
    borderRadius: 14,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
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
    fontWeight: 'bold',
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
  promoImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  promoDiscount: {
    color: colors.buttonText,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
});

export default HomeScreen;