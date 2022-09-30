import type { Store, ReadonlyStoreInstanceOf } from '../stores/types';
import type { SelectorFactory } from './types';

export const createSelector = <TStores extends Record<string, Store>, TParams extends unknown[], TReturnValue>(
  stores: TStores,
  selectorFn: (
    stores: {
      [TKey in keyof TStores]: ReadonlyStoreInstanceOf<TStores[TKey]>;
    },
    ...params: TParams
  ) => TReturnValue,
  { fallback }: { fallback?: TReturnValue } = {}
): SelectorFactory<TParams, TReturnValue> => {
  const selector: SelectorFactory<TParams, TReturnValue> = (...params: TParams) => {
    return {
      params,
      stores,
      fallback,
      select(stores: {
        [TKey in keyof TStores]: ReadonlyStoreInstanceOf<TStores[TKey]>;
      }) {
        return selectorFn(stores, ...params);
      },
    };
  };

  return selector;
};
