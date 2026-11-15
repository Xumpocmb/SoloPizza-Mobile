import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../../services/apiService';
import { API_ENDPOINTS } from '../../config/api';
import { apiErrorMessage } from '../../utils/apiError';

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
  async ({ first_name, last_name }, { rejectWithValue }) => {
    try {
      // сервер даёт менять только имя и фамилию; email — от Google/Apple
      const user = await apiService.patch(API_ENDPOINTS.ME, { first_name, last_name });
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      return user;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error, 'Не удалось обновить профиль'));
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
      await apiService.clearTokens();
      await AsyncStorage.removeItem('user_data');
    } catch (error) {
      // Хранилище могло быть недоступно — состояние всё равно сбрасываем
    }
    return true;
  }
);

export const loadStoredTokens = createAsyncThunk(
  'auth/loadStoredTokens',
  async () => {
    const accessToken = await apiService.getAuthToken();
    const refreshToken = await apiService.getRefreshToken();
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