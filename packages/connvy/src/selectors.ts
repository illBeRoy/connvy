import { useState } from 'react';
import { useConnvy } from './provider';
import type { Store, ReadonlyStoreAPI, PublicStoreAPI } from './stores';

export interface SelectorFactory<TParams extends any[], TReturnValue> {
  (...params: TParams): Selector<TReturnValue>;
}

export interface Selector<TReturnValue> {
  params: unknown[];
  stores: Record<string, Store>;
  select(stores: Record<string, ReadonlyStoreAPI>): TReturnValue;
}

export const createSelector = <
  TStores extends Record<string, Store>,
  TParams extends any[],
  TReturnValue extends Exclude<any, Promise<any>>
>(
  stores: TStores,
  selectorFn: (
    stores: {
      [TKey in keyof TStores]: ReadonlyStoreAPI<
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
      params,
      stores,
      select(stores: {
        [TKey in keyof TStores]: ReadonlyStoreAPI<
          ReturnType<TStores[TKey]['schema']>
        >;
      }) {
        return selectorFn(stores, ...params);
      },
    };
  };

  return selector;
};

export const useSelector = <T>(
  selector: Selector<T>
): [T | null, unknown | null] => {
  const connvy = useConnvy();
  const [memoizationKey, setMemoizationKey] = useState(Math.random());

  const stores: Record<string, ReadonlyStoreAPI> = {};
  for (const [key, store] of Object.entries(selector.stores)) {
    const storeInstance = connvy.getStoreStateContainer(store);

    // @ts-expect-error asdfdasfad
    const storeInstanceThatIsReadOnly: PublicStoreAPI = {
      get: (...args) => storeInstance.get(...args),
      getBy: (...args) => storeInstance.getBy(...args),
      list: (...args) => storeInstance.list(...args),
      listBy: (...args) => storeInstance.listBy(...args),
      create() {
        throw new Error(
          'Stores are read-only in selectors (tried to use the "create" method)'
        );
      },
      update() {
        throw new Error(
          'Stores are read-only in selectors (tried to use the "update" method)'
        );
      },
      updateAllWhere() {
        throw new Error(
          'Stores are read-only in selectors (tried to use the "updateAllWhere" method)'
        );
      },
      delete() {
        throw new Error(
          'Stores are read-only in selectors (tried to use the "delete" method)'
        );
      },
      deleteAllWhere() {
        throw new Error(
          'Stores are read-only in selectors (tried to use the "deleteAllWhere" method)'
        );
      },
    };

    stores[key] = storeInstanceThatIsReadOnly;
  }

  let result: T | null = null,
    error: unknown | null = null;
  try {
    result = selector.select(stores);
  } catch (err) {
    error = err;
  }

  if (result instanceof Promise) {
    throw new Error('Selectors cannot use async functions or return promises');
  }

  return [result, error];
};
