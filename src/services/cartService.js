import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

class CartService {
  // Get cart items
  async getCart() {
    try {
      const response = await apiService.get(API_ENDPOINTS.CART.ITEMS);
      return response;
    } catch (error) {
      console.error('Get cart failed:', error);
      throw error;
    }
  }

  // Add item to cart
  async addToCart(productData) {
    try {
      const response = await apiService.post(API_ENDPOINTS.CART.ADD, productData);
      return response;
    } catch (error) {
      console.error('Add to cart failed:', error);
      throw error;
    }
  }

  // Update cart item
  async updateCartItem(itemId, updateData) {
    try {
      const response = await apiService.patch(API_ENDPOINTS.CART.UPDATE(itemId), updateData);
      return response;
    } catch (error) {
      console.error('Update cart item failed:', error);
      throw error;
    }
  }

  // Remove item from cart
  async removeFromCart(itemId) {
    try {
      const response = await apiService.delete(API_ENDPOINTS.CART.REMOVE(itemId));
      return response;
    } catch (error) {
      console.error('Remove from cart failed:', error);
      throw error;
    }
  }

  // Clear entire cart
  async clearCart() {
    try {
      const response = await apiService.delete(API_ENDPOINTS.CART.CLEAR);
      return response;
    } catch (error) {
      console.error('Clear cart failed:', error);
      throw error;
    }
  }

  // Get cart summary (totals)
  async getCartSummary() {
    try {
      const response = await apiService.get(API_ENDPOINTS.CART.SUMMARY);
      return response;
    } catch (error) {
      console.error('Get cart summary failed:', error);
      throw error;
    }
  }

  // Apply promo code
  async applyPromoCode(promoCode) {
    try {
      const response = await apiService.post(API_ENDPOINTS.CART.PROMO, {
        promo_code: promoCode,
      });
      return response;
    } catch (error) {
      console.error('Apply promo code failed:', error);
      throw error;
    }
  }

  // Remove promo code
  async removePromoCode() {
    try {
      const response = await apiService.delete(API_ENDPOINTS.CART.PROMO);
      return response;
    } catch (error) {
      console.error('Remove promo code failed:', error);
      throw error;
    }
  }

  // Local cart management for offline support
  async getLocalCart() {
    try {
      const cartData = await AsyncStorage.getItem('local_cart');
      return cartData ? JSON.parse(cartData) : { items: [], total: 0 };
    } catch (error) {
      console.error('Get local cart failed:', error);
      return { items: [], total: 0 };
    }
  }

  // Save cart locally
  async saveLocalCart(cartData) {
    try {
      await AsyncStorage.setItem('local_cart', JSON.stringify(cartData));
    } catch (error) {
      console.error('Save local cart failed:', error);
    }
  }

  // Sync local cart with server
  async syncCart() {
    try {
      const localCart = await this.getLocalCart();
      
      if (localCart.items.length > 0) {
        // Send local cart items to server
        for (const item of localCart.items) {
          await this.addToCart(item);
        }
        
        // Clear local cart after sync
        await AsyncStorage.removeItem('local_cart');
      }
      
      // Get updated cart from server
      return await this.getCart();
    } catch (error) {
      console.error('Sync cart failed:', error);
      throw error;
    }
  }

  // Add item to local cart (offline mode)
  async addToLocalCart(productData) {
    try {
      const localCart = await this.getLocalCart();
      
      // Check if item already exists
      const existingItemIndex = localCart.items.findIndex(
        item => item.product_id === productData.product_id &&
                JSON.stringify(item.variants) === JSON.stringify(productData.variants)
      );
      
      if (existingItemIndex >= 0) {
        // Update quantity
        localCart.items[existingItemIndex].quantity += productData.quantity || 1;
      } else {
        // Add new item
        localCart.items.push({
          ...productData,
          id: Date.now(), // Temporary ID
          quantity: productData.quantity || 1,
        });
      }
      
      // Recalculate total
      localCart.total = localCart.items.reduce(
        (sum, item) => sum + (item.price * item.quantity), 0
      );
      
      await this.saveLocalCart(localCart);
      return localCart;
    } catch (error) {
      console.error('Add to local cart failed:', error);
      throw error;
    }
  }

  // Remove item from local cart
  async removeFromLocalCart(itemId) {
    try {
      const localCart = await this.getLocalCart();
      localCart.items = localCart.items.filter(item => item.id !== itemId);
      
      // Recalculate total
      localCart.total = localCart.items.reduce(
        (sum, item) => sum + (item.price * item.quantity), 0
      );
      
      await this.saveLocalCart(localCart);
      return localCart;
    } catch (error) {
      console.error('Remove from local cart failed:', error);
      throw error;
    }
  }

  // Get cart item count
  async getCartItemCount() {
    try {
      const cart = await this.getCart();
      return cart.items ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
    } catch (error) {
      // Fallback to local cart
      const localCart = await this.getLocalCart();
      return localCart.items.reduce((sum, item) => sum + item.quantity, 0);
    }
  }
}

export default new CartService();