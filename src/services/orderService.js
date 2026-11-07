import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';

class OrderService {
  // Create new order
  async createOrder(orderData) {
    try {
      const response = await apiService.post(API_ENDPOINTS.ORDERS.CREATE, orderData);
      return response;
    } catch (error) {
      console.error('Create order failed:', error);
      throw error;
    }
  }

  // Get user orders
  async getOrders(filters = {}) {
    try {
      const response = await apiService.get(API_ENDPOINTS.ORDERS.LIST, filters);
      return response;
    } catch (error) {
      console.error('Get orders failed:', error);
      throw error;
    }
  }

  // Get order details
  async getOrderDetail(orderId) {
    try {
      const response = await apiService.get(API_ENDPOINTS.ORDERS.DETAIL(orderId));
      return response;
    } catch (error) {
      console.error('Get order detail failed:', error);
      throw error;
    }
  }

  // Cancel order
  async cancelOrder(orderId, reason = '') {
    try {
      const response = await apiService.patch(API_ENDPOINTS.ORDERS.CANCEL(orderId), {
        reason,
      });
      return response;
    } catch (error) {
      console.error('Cancel order failed:', error);
      throw error;
    }
  }

  // Track order status
  async trackOrder(orderId) {
    try {
      const response = await apiService.get(API_ENDPOINTS.ORDERS.TRACK(orderId));
      return response;
    } catch (error) {
      console.error('Track order failed:', error);
      throw error;
    }
  }

  // Repeat order
  async repeatOrder(orderId) {
    try {
      const response = await apiService.post(API_ENDPOINTS.ORDERS.REPEAT(orderId));
      return response;
    } catch (error) {
      console.error('Repeat order failed:', error);
      throw error;
    }
  }

  // Get order statuses
  async getOrderStatuses() {
    try {
      const response = await apiService.get(API_ENDPOINTS.ORDERS.STATUSES);
      return response;
    } catch (error) {
      console.error('Get order statuses failed:', error);
      throw error;
    }
  }

  // Get delivery options
  async getDeliveryOptions() {
    try {
      const response = await apiService.get(API_ENDPOINTS.ORDERS.DELIVERY_OPTIONS);
      return response;
    } catch (error) {
      console.error('Get delivery options failed:', error);
      throw error;
    }
  }

  // Calculate delivery cost
  async calculateDelivery(address) {
    try {
      const response = await apiService.post(API_ENDPOINTS.ORDERS.DELIVERY_COST, {
        address,
      });
      return response;
    } catch (error) {
      console.error('Calculate delivery failed:', error);
      throw error;
    }
  }

  // Get payment methods
  async getPaymentMethods() {
    try {
      const response = await apiService.get(API_ENDPOINTS.ORDERS.PAYMENT_METHODS);
      return response;
    } catch (error) {
      console.error('Get payment methods failed:', error);
      throw error;
    }
  }

  // Process payment
  async processPayment(paymentData) {
    try {
      const response = await apiService.post(API_ENDPOINTS.ORDERS.PAYMENT, paymentData);
      return response;
    } catch (error) {
      console.error('Process payment failed:', error);
      throw error;
    }
  }

  // Get order receipt
  async getOrderReceipt(orderId) {
    try {
      const response = await apiService.get(API_ENDPOINTS.ORDERS.RECEIPT(orderId));
      return response;
    } catch (error) {
      console.error('Get order receipt failed:', error);
      throw error;
    }
  }

  // Rate order
  async rateOrder(orderId, rating, comment = '') {
    try {
      const response = await apiService.post(API_ENDPOINTS.ORDERS.RATE(orderId), {
        rating,
        comment,
      });
      return response;
    } catch (error) {
      console.error('Rate order failed:', error);
      throw error;
    }
  }

  // Get order history with pagination
  async getOrderHistory(page = 1, limit = 10) {
    try {
      const response = await apiService.get(API_ENDPOINTS.ORDERS.LIST, {
        page,
        limit,
        ordering: '-created_at',
      });
      return response;
    } catch (error) {
      console.error('Get order history failed:', error);
      throw error;
    }
  }

  // Get active orders
  async getActiveOrders() {
    try {
      const response = await apiService.get(API_ENDPOINTS.ORDERS.LIST, {
        status__in: 'pending,confirmed,preparing,ready,delivering',
      });
      return response;
    } catch (error) {
      console.error('Get active orders failed:', error);
      throw error;
    }
  }

  // Get order by status
  async getOrdersByStatus(status) {
    try {
      const response = await apiService.get(API_ENDPOINTS.ORDERS.LIST, {
        status,
      });
      return response;
    } catch (error) {
      console.error('Get orders by status failed:', error);
      throw error;
    }
  }

  // Validate order before creation
  async validateOrder(orderData) {
    try {
      const response = await apiService.post(API_ENDPOINTS.ORDERS.VALIDATE, orderData);
      return response;
    } catch (error) {
      console.error('Validate order failed:', error);
      throw error;
    }
  }

  // Get estimated delivery time
  async getEstimatedDeliveryTime(address) {
    try {
      const response = await apiService.post(API_ENDPOINTS.ORDERS.DELIVERY_TIME, {
        address,
      });
      return response;
    } catch (error) {
      console.error('Get estimated delivery time failed:', error);
      throw error;
    }
  }
}

export default new OrderService();