// In-memory реализация AsyncStorage для тестов.
const store = new Map();
module.exports = {
  __esModule: true,
  default: {
    getItem: jest.fn(async k => (store.has(k) ? store.get(k) : null)),
    setItem: jest.fn(async (k, v) => { store.set(k, String(v)); }),
    removeItem: jest.fn(async k => { store.delete(k); }),
    multiGet: jest.fn(async ks => ks.map(k => [k, store.has(k) ? store.get(k) : null])),
    multiSet: jest.fn(async kv => kv.forEach(([k, v]) => store.set(k, String(v)))),
    multiRemove: jest.fn(async ks => ks.forEach(k => store.delete(k))),
    clear: jest.fn(async () => store.clear()),
    getAllKeys: jest.fn(async () => Array.from(store.keys())),
  },
};
