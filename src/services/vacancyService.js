/**
 * VacancyService — вакансии и отклики (v1.1, вечер 02.11.2026).
 *
 * Контракт (backend-contract.md §1.1 в репо памяти):
 *   GET  /api/v1/vacancies/                      → [{ id, title, salary, benefits[], image }]
 *   GET  /api/v1/vacancies/<id>/                 → + description
 *   POST /api/v1/vacancies/<id>/applications/    → 201; тело:
 *        { name, age(16..100), phone, experience_years(0..50), work_experience }
 *        ошибки валидации: 400 { field: [сообщения] } — экран маппит в подсветку.
 *
 * Филиалонезависимы; salary может быть null («по договорённости»).
 * Запросы публичные, silent: отсутствие вакансий — не ошибка приложения.
 */

import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';

class VacancyService {
  async getVacancies() {
    try {
      const list = await apiService.get(
        API_ENDPOINTS.VACANCIES.LIST,
        {},
        { silent: true },
      );
      return Array.isArray(list) ? list : [];
    } catch (error) {
      return [];
    }
  }

  async getVacancy(id) {
    return apiService.get(API_ENDPOINTS.VACANCIES.DETAIL(id), {}, { silent: true });
  }

  /** Бросает ошибку как есть: экран разбирает 400 { field: [msg] }. */
  async apply(vacancyId, data) {
    return apiService.post(API_ENDPOINTS.VACANCIES.APPLY(vacancyId), data);
  }
}

export default new VacancyService();
