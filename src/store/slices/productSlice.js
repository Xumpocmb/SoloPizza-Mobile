/**
 * Product slice
 *
 * СОЗДАН ПРИ АУДИТЕ 31.10.2026.
 *
 * Зачем: HomeScreen, CatalogScreen и ProductDetailScreen импортировали
 * '../store/slices/productSlice', которого не существовало → приложение
 * падало на старте. Кроме того, экраны читают `state.products`, а в store
 * зарегистрирован только ключ `catalog`.
 *
 * Этот слайс повторяет форму состояния, которую уже ожидают экраны:
 *   { products, featuredProducts, categories, currentProduct, loading, error }
 *
 * ⚠️ ВАЖНО: сейчас в проекте ДВА слайса про каталог — `catalogSlice`
 * (зарегистрирован как state.catalog) и этот `productSlice` (state.products).
 * Экраны используют только `products`. После того как приложение запустится,
 * `catalogSlice` нужно удалить, а его вызовы перевести сюда. Отмечено в плане
 * как Фаза 2.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { catalogService } from '../../services';

const PAGE_SIZE = 12;

/**
 * Нормализует ответ бэкенда к плоскому массиву.
 * Django REST Framework отдаёт пагинированный ответ { count, next, previous, results },
 * но часть эндпоинтов может возвращать просто массив — поддерживаем оба варианта.
 */
function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
}

// ─────────────────────────────────────────────────────────────
// Thunks
// ─────────────────────────────────────────────────────────────

export const fetchCategories = createAsyncThunk(
  'products/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      return toArray(await catalogService.getCategories());
    } catch (error) {
      return rejectWithValue(error?.message || 'Не удалось загрузить категории');
    }
  },
);

/**
 * Общий список товаров.
 * @param {{categoryId?: number, search?: string, page?: number}} [params]
 */
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (params = {}, { rejectWithValue }) => {
    const { categoryId, search, page = 1, force } = params || {};
    try {
      const payload = await catalogService.getProducts({
        category: categoryId,
        search,
        page,
        force,
      });

      const products = toArray(payload);
      const count = payload?.count ?? products.length;

      return {
        products,
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(count / PAGE_SIZE)),
        hasNext: Boolean(payload?.next),
        hasPrevious: Boolean(payload?.previous),
      };
    } catch (error) {
      return rejectWithValue(error?.message || 'Не удалось загрузить товары');
    }
  },
);

/** Товары для главного экрана. */
export const fetchFeaturedProducts = createAsyncThunk(
  'products/fetchFeaturedProducts',
  async ({ limit = 6, force } = {}, { rejectWithValue }) => {
    try {
      const payload = await catalogService.getPopularProducts({ limit, force });
      return toArray(payload);
    } catch (error) {
      return rejectWithValue(error?.message || 'Не удалось загрузить рекомендуемые товары');
    }
  },
);

/**
 * Карточка товара.
 * Экран вызывает dispatch(fetchProductById(id)) — принимаем и число, и объект { productId }.
 */
export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (productId, { rejectWithValue }) => {
    const id =
      typeof productId === 'object' && productId !== null
        ? productId.productId ?? productId.id
        : productId;

    if (id === undefined || id === null) {
      return rejectWithValue('Не указан идентификатор товара');
    }

    try {
      return await catalogService.getProductDetail(id);
    } catch (error) {
      return rejectWithValue(error?.message || 'Не удалось загрузить товар');
    }
  },
);

// ─────────────────────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────────────────────

/** Филиалы: контракт app_api требует branch_id в каждом запросе каталога. */
export const fetchBranches = createAsyncThunk(
  'products/fetchBranches',
  async (arg, { rejectWithValue }) => {
    const force = arg === true || (arg && arg.force === true);
    try {
      await catalogService.ensureBranchId({ force });
      return toArray(await catalogService.getBranches({ force }));
    } catch (error) {
      return rejectWithValue(error?.message || 'Не удалось загрузить филиалы');
    }
  },
);

/** Смена филиала: сбрасывает кэш товаров сервиса и список товаров в стейте. */
export const selectBranch = createAsyncThunk(
  'products/selectBranch',
  async (branchId, { rejectWithValue }) => {
    if (branchId === undefined || branchId === null) {
      return rejectWithValue('Не указан идентификатор филиала');
    }
    catalogService.setBranchId(branchId);
    return branchId;
  },
);

const initialState = {
  products: [],
  featuredProducts: [],
  categories: [],
  currentProduct: null,
  branches: [],
  branchId: null,
  // true, когда каталог работает на демо-данных (API ещё не задеплоен)
  isDemo: false,
  currentPage: 1,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
  selectedCategory: null,
  searchQuery: '',
  // Экраны деструктуризируют поле `loading` (не `isLoading`)
  loading: false,
  loadingProduct: false,
  error: null,
};

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setSelectedCategory: (state, action) => {
      state.selectedCategory = action.payload;
      state.currentPage = 1;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      state.currentPage = 1;
    },
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
    clearProductsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Категории
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
        state.isDemo = catalogService.isDemoActive();
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Список товаров
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.products;
        state.currentPage = action.payload.currentPage;
        state.totalPages = action.payload.totalPages;
        state.hasNext = action.payload.hasNext;
        state.hasPrevious = action.payload.hasPrevious;
        state.isDemo = catalogService.isDemoActive();
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.products = [];
        state.error = action.payload;
      })

      // Рекомендуемые
      .addCase(fetchFeaturedProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.featuredProducts = action.payload;
      })
      .addCase(fetchFeaturedProducts.rejected, (state, action) => {
        state.loading = false;
        state.featuredProducts = [];
        state.error = action.payload;
      })

      // Карточка товара
      .addCase(fetchProductById.pending, (state) => {
        state.loadingProduct = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loadingProduct = false;
        state.currentProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loadingProduct = false;
        state.currentProduct = null;
        state.error = action.payload;
      })

      // Филиалы
      .addCase(fetchBranches.fulfilled, (state, action) => {
        state.branches = action.payload;
        state.branchId = catalogService.getBranchId();
        state.isDemo = catalogService.isDemoActive();
      })
      .addCase(fetchBranches.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(selectBranch.fulfilled, (state, action) => {
        state.branchId = action.payload;
        state.products = [];
        state.currentProduct = null;
        state.isDemo = catalogService.isDemoActive();
      });
  },
});

export const {
  setSelectedCategory,
  setSearchQuery,
  clearCurrentProduct,
  clearProductsError,
} = productSlice.actions;

export default productSlice.reducer;
