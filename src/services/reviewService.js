/**
 * Книга замечаний и предложений (как solo-pizza.by/reviews/).
 * Список — только одобренные модератором отзывы; новый отзыв уходит на модерацию сайта.
 */
import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';

export const REVIEW_TEXT_MAX = 2000;

export default {
  list() {
    return apiService.get(API_ENDPOINTS.REVIEWS);
  },

  create({ rating, text }) {
    return apiService.post(API_ENDPOINTS.REVIEWS, { rating, text: text.trim() });
  },
};
