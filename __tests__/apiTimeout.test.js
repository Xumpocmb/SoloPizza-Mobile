/**
 * Дефект №1 из памяти агента (02.11.2026): таймер таймаута в makeRequest
 * не очищался и после успешного ответа реджектил промис без обработчика →
 * unhandled rejection. Регрессия: каждый таймер, созданный запросом,
 * обязан быть очищен, и ни одного unhandled rejection не происходит.
 */

import apiService from '../src/services/apiService';

const jsonResponse = (payload) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve(payload),
});

afterEach(() => {
  delete global.fetch;
});

test('успешный запрос очищает свой таймер таймаута', async () => {
  global.fetch = jest.fn((url, opts) => {
    // сигнал отмены доходит до fetch
    expect(opts.signal).toBeTruthy();
    return Promise.resolve(jsonResponse({ currency: 'BYN' }));
  });

  const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
  const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);

  try {
    const data = await apiService.makeRequest('/meta/', { silent: true, timeout: 30 });
    expect(data).toEqual({ currency: 'BYN' });

    // таймеры, созданные ДО этого момента (то есть запросом), все очищены
    const timers = setTimeoutSpy.mock.results.map((r) => r.value);
    expect(timers.length).toBeGreaterThan(0);
    timers.forEach((timer) => expect(clearTimeoutSpy).toHaveBeenCalledWith(timer));

    // пережить момент, когда старый таймер уже сработал бы
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(unhandled).toEqual([]);
  } finally {
    process.off('unhandledRejection', onUnhandled);
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  }
});

test('таймаут отменяет fetch через AbortController и отдаёт ошибку таймаута', async () => {
  let aborted = false;
  global.fetch = jest.fn((url, opts) => new Promise((resolve, reject) => {
    opts.signal.addEventListener('abort', () => {
      aborted = true;
      reject(new Error('Aborted'));
    });
  }));

  const error = await apiService
    .makeRequest('/meta/', { silent: true, timeout: 20 })
    .then(() => null)
    .catch((e) => e);

  expect(error).toBeTruthy();
  expect(error.isTimeoutError).toBe(true);
  // даём abort-обработчику fetch успеть
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(aborted).toBe(true);
});
