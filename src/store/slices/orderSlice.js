import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Асинхронные действия
export const createOrder = createAsyncThunk(
  'order/createOrder',
  async (orderData, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      
      const response = await axios.post(
        `${API_BASE_URL}/orders/create/`,
        orderData,
        {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Ошибка создания заказа'
      );
    }
  }
);

export const fetchOrderHistory = createAsyncThunk(
  'order/fetchOrderHistory',
  async ({ page = 1 } = {}, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      
      const response = await axios.get(
        `${API_BASE_URL}/orders/?page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
        }
      );
      
      return {
        orders: response.data.results,
        totalPages: Math.ceil(response.data.count / 10),
        currentPage: page,
        hasNext: !!response.data.next,
        hasPrevious: !!response.data.previous,
      };
    } catch (error) {
      return rejectWithValue('Ошибка загрузки истории заказов');
    }
  }
);

export const fetchOrderDetail = createAsyncThunk(
  'order/fetchOrderDetail',
  async (orderId, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      
      const response = await axios.get(
        `${API_BASE_URL}/orders/${orderId}/`,
        {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
        }
      );
      
      return response.data;
    } catch (error) {
      return rejectWithValue('Ошибка загрузки деталей заказа');
    }
  }
);

export const cancelOrder = createAsyncThunk(
  'order/cancelOrder',
  async (orderId, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      
      const response = await axios.patch(
        `${API_BASE_URL}/orders/${orderId}/cancel/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
        }
      );
      
      return response.data;
    } catch (error) {
      return rejectWithValue('Ошибка отмены заказа');
    }
  }
);

const initialState = {
  orders: [],
  currentOrder: null,
  orderDetail: null,
  currentPage: 1,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
  isLoading: false,
  isCreatingOrder: false,
  error: null,
  lastCreatedOrder: null,
};

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
    clearOrderDetail: (state) => {
      state.orderDetail = null;
    },
    clearLastCreatedOrder: (state) => {
      state.lastCreatedOrder = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Order
      .addCase(createOrder.pending, (state) => {
        state.isCreatingOrder = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.isCreatingOrder = false;
        state.lastCreatedOrder = action.payload;
        state.error = null;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.isCreatingOrder = false;
        state.error = action.payload;
      })
      
      // Fetch Order History
      .addCase(fetchOrderHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrderHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders = action.payload.orders;
        state.currentPage = action.payload.currentPage;
        state.totalPages = action.payload.totalPages;
        state.hasNext = action.payload.hasNext;
        state.hasPrevious = action.payload.hasPrevious;
      })
      .addCase(fetchOrderHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Order Detail
      .addCase(fetchOrderDetail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrderDetail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orderDetail = action.payload;
      })
      .addCase(fetchOrderDetail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Cancel Order
      .addCase(cancelOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        // Обновляем заказ в списке
        const orderIndex = state.orders.findIndex(order => order.id === action.payload.id);
        if (orderIndex >= 0) {
          state.orders[orderIndex] = action.payload;
        }
        // Обновляем детали заказа, если они загружены
        if (state.orderDetail && state.orderDetail.id === action.payload.id) {
          state.orderDetail = action.payload;
        }
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearCurrentOrder,
  clearOrderDetail,
  clearLastCreatedOrder,
  clearError,
} = orderSlice.actions;

export default orderSlice.reducer;