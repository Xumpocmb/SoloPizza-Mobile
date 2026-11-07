import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// API базовый URL (нужно будет настроить под ваш сервер)
const API_BASE_URL = 'http://localhost:8000/api';

// Асинхронные действия
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/token/`, {
        username,
        password,
      });
      
      const { access, refresh } = response.data;
      
      // Сохраняем токены в AsyncStorage
      await AsyncStorage.setItem('access_token', access);
      await AsyncStorage.setItem('refresh_token', refresh);
      
      return { access, refresh };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Ошибка входа'
      );
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async ({ username, email, password, firstName, lastName }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register/`, {
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      });
      
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || 'Ошибка регистрации'
      );
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        throw new Error('Нет refresh токена');
      }
      
      const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
        refresh: refreshToken,
      });
      
      const { access } = response.data;
      await AsyncStorage.setItem('access_token', access);
      
      return { access };
    } catch (error) {
      return rejectWithValue('Ошибка обновления токена');
    }
  }
);

// ───────────────────────────────────────────────────────────
// ДОБАВЛЕНО ПРИ АУДИТЕ 31.10.2026
// ───────────────────────────────────────────────────────────

/**
 * Обновление профиля.
 * ProfileScreen вызывает dispatch(updateProfile(formData)).unwrap() —
 * thunk'а не существовало → «updateProfile is not a function».
 */
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/auth/profile/`,
        userData,
        { headers: { Authorization: `Bearer ${await AsyncStorage.getItem('access_token')}` } },
      );
      await AsyncStorage.setItem('user_data', JSON.stringify(response));
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Не удалось обновить профиль');
    }
  }
);

/**
 * Выход с очисткой хранилища.
 *
 * ⚠️ Раньше очистка AsyncStorage лежала ВНУТРИ reducer'а `logout`.
 * Reducer обязан быть чистой функцией: в StrictMode он вызывается дважды,
 * а побочные эффекты в нём непредсказуемы. Логика перенесена сюда.
 *
 * Совместимость: ниже в slice action `logout` сохранён, но он теперь
 * только сбрасывает состояние. Экраны, которые делали `dispatch(logout())`,
 * продолжают работать; рекомендуется заменить на `dispatch(logoutUser())`.
 */
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async () => {
    try {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
    } catch (error) {
      // Хранилище могло быть недоступно — состояние всё равно сбрасываем
    }
    return true;
  }
);

export const loadStoredTokens = createAsyncThunk(
  'auth/loadStoredTokens',
  async () => {
    const accessToken = await AsyncStorage.getItem('access_token');
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    const rawUser = await AsyncStorage.getItem('user_data');

    let user = null;
    try {
      user = rawUser ? JSON.parse(rawUser) : null;
    } catch (e) {
      user = null;
    }

    return { access: accessToken, refresh: refreshToken, user };
  }
);

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Чистый reducer: только сброс состояния.
    // Очистка AsyncStorage вынесена в thunk logoutUser (см. выше).
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accessToken = action.payload.access;
        state.refreshToken = action.payload.refresh;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      
      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Refresh Token
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.accessToken = action.payload.access;
      })
      .addCase(refreshToken.rejected, (state) => {
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      })
      
      // Load Stored Tokens
      .addCase(loadStoredTokens.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadStoredTokens.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.access && action.payload.refresh) {
          state.accessToken = action.payload.access;
          state.refreshToken = action.payload.refresh;
          state.user = action.payload.user || null;
          state.isAuthenticated = true;
        }
      })
      .addCase(loadStoredTokens.rejected, (state) => {
        state.isLoading = false;
      })

      // Update Profile (добавлено при аудите)
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Logout с очисткой хранилища (добавлено при аудите)
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;