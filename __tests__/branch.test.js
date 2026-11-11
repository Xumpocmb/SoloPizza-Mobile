import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../src/store/store';
import { addToCart } from '../src/store/slices/cartSlice';
import { selectBranch, restoreBranch } from '../src/store/slices/productSlice';
import catalogService from '../src/services/catalogService';

test('смена филиала очищает корзину, тот же филиал — нет; выбор запоминается', async () => {
  catalogService.setBranchId(1);
  await store.dispatch(addToCart({ id: 'pizza', price: 10, quantity: 1 }));
  expect(store.getState().cart.itemsCount).toBe(1);

  await store.dispatch(selectBranch(1));
  expect(store.getState().cart.itemsCount).toBe(1);

  await store.dispatch(selectBranch(2));
  expect(store.getState().cart.itemsCount).toBe(0);
  expect(store.getState().products.branchId).toBe(2);
  expect(await AsyncStorage.getItem('branch_id')).toBe('2');

  // холодный старт: филиал восстанавливается до первого запроса каталога
  catalogService.setBranchId(null);
  await store.dispatch(restoreBranch());
  expect(catalogService.getBranchId()).toBe(2);
});
