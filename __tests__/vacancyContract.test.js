/**
 * Контракт v1.1: вакансии и отклики (02.11.2026).
 * Формы сняты с живого API и схемы VacancyApplication.
 */

jest.mock('../src/services/apiService', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

import apiService from '../src/services/apiService';
import { vacancyService } from '../src/services';

const LIST = [
  { id: 3, title: 'Курьер на личном авто', salary: null, benefits: [], image: 'https://solo-pizza.by/media/vacancies/1.png' },
];
const DETAIL = { ...LIST[0], description: 'Solo Pizza ищет курьеров…' };

beforeEach(() => {
  apiService.get.mockReset();
  apiService.post.mockReset();
});

test('список вакансий: путь и форма, salary nullable', async () => {
  apiService.get.mockResolvedValue(LIST);
  const list = await vacancyService.getVacancies();
  expect(apiService.get).toHaveBeenCalledWith('/vacancies/', {}, expect.any(Object));
  expect(list[0].salary).toBeNull();
  expect(Array.isArray(list[0].benefits)).toBe(true);
});

test('сбой списка — не ошибка приложения: пустой массив', async () => {
  apiService.get.mockRejectedValue({ status: 404, message: 'HTTP 404' });
  const list = await vacancyService.getVacancies();
  expect(list).toEqual([]);
});

test('деталь: путь с id', async () => {
  apiService.get.mockResolvedValue(DETAIL);
  const detail = await vacancyService.getVacancy(3);
  expect(apiService.get).toHaveBeenCalledWith('/vacancies/3/', {}, expect.any(Object));
  expect(detail.description).toBeTruthy();
});

test('отклик: POST на /vacancies/<id>/applications/ с телом схемы', async () => {
  apiService.post.mockResolvedValue({ id: 1 });
  const payload = {
    name: 'Иванов Иван',
    age: 25,
    phone: '+375291234567',
    experience_years: 2,
    work_experience: 'Курьер 2 года',
  };
  await vacancyService.apply(3, payload);
  expect(apiService.post).toHaveBeenCalledWith('/vacancies/3/applications/', payload);
});

test('серверная валидация 400 пробрасывается с data {field:[msg]}', async () => {
  const serverError = { status: 400, message: 'bad', data: { age: ['Обязательное поле.'] } };
  apiService.post.mockRejectedValue(serverError);
  const error = await vacancyService.apply(3, {}).then(() => null, (e) => e);
  expect(error.status).toBe(400);
  expect(error.data.age[0]).toBe('Обязательное поле.');
});
