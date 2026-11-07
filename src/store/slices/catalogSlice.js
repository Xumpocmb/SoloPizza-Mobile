import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Асинхронные действия
export const fetchCategories = createAsyncThunk(
  'catalog/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/catalog/categories/`);
      return response.data;
    } catch (error) {
      return rejectWithValue('Ошибка загрузки категорий');
    }
  }
);

export const fetchProducts = createAsyncThunk(
  'catalog/fetchProducts',
  async ({ categoryId, search, page = 1 } = {}, { rejectWithValue }) => {
    try {
      let url = `${API_BASE_URL}/catalog/products/?page=${page}`;
      
      if (categoryId) {
        url += `&category=${categoryId}`;
      }
      
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      const response = await axios.get(url);
      return {
        products: response.data.results,
        totalPages: Math.ceil(response.data.count / 12),
        currentPage: page,
        hasNext: !!response.data.next,
        hasPrevious: !!response.data.previous,
      };
    } catch (error) {
      return rejectWithValue('Ошибка загрузки товаров');
    }
  }
);

export const fetchProductDetail = createAsyncThunk(
  'catalog/fetchProductDetail',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/catalog/products/${productId}/`);
      return response.data;
    } catch (error) {
      return rejectWithValue('Ошибка загрузки товара');
    }
  }
);

const initialState = {
  categories: [],
  products: [],
  currentProduct: null,
  currentPage: 1,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
  selectedCategory: null,
  searchQuery: '',
  isLoading: false,
  isLoadingProduct: false,
  error: null,
};

const catalogSlice = createSlice({
  name: 'catalog',
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
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Categories
      .addCase(fetchCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Products
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = action.payload.products;
        state.currentPage = action.payload.currentPage;
        state.totalPages = action.payload.totalPages;
        state.hasNext = action.payload.hasNext;
        state.hasPrevious = action.payload.hasPrevious;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Product Detail
      .addCase(fetchProductDetail.pending, (state) => {
        state.isLoadingProduct = true;
        state.error = null;
      })
      .addCase(fetchProductDetail.fulfilled, (state, action) => {
        state.isLoadingProduct = false;
        state.currentProduct = action.payload;
      })
      .addCase(fetchProductDetail.rejected, (state, action) => {
        state.isLoadingProduct = false;
        state.error = action.payload;
      });
  },
});

export const {
  setSelectedCategory,
  setSearchQuery,
  clearCurrentProduct,
  clearError,
} = catalogSlice.actions;

export default catalogSlice.reducer;