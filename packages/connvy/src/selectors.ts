import type { Store, PublicStoreAPI } from './stores';
import { useStore } from './useStore';

export interface SelectorFactory<TParams extends any[], TReturnValue> {
  (...params: TParams): Selector<TReturnValue>;
}

export interface Selector<TReturnValue> {
  stores: Record<string, Store>;
  select(stores: Record<string, PublicStoreAPI>): TReturnValue;
}

export const createSelector = <
  TStores extends Record<string, Store>,
  TParams extends any[],
  TReturnValue
>(
  stores: TStores,
  selectorFn: (
    stores: {
      [TKey in keyof TStores]: PublicStoreAPI<
        ReturnType<TStores[TKey]['schema']>
      >;
    },
    ...params: TParams
  ) => TReturnValue
): SelectorFactory<TParams, TReturnValue> => {
  const selector: SelectorFactory<TParams, TReturnValue> = (
    ...params: TParams
  ) => {
    return {
      stores,
      select(stores: {
        [TKey in keyof TStores]: PublicStoreAPI<
          ReturnType<TStores[TKey]['schema']>
        >;
      }) {
        return selectorFn(stores, ...params);
      },
    };
  };

  return selector;
};

export const useSelector = <T>(selector: Selector<T>): [T] => {
  const stores: Record<string, PublicStoreAPI> = {};

  for (const [key, store] of Object.entries(selector.stores)) {
    const storeInstance = useStore(store);
    stores[key] = storeInstance;
  }

  return [selector.select(stores)];
};
