import { useState } from 'react';
import {
  AttemptingToWriteFromSelectorError,
  SelectorCantBeAsyncError,
} from './errors';
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

    const storeInstanceThatIsReadOnly: PublicStoreAPI = {
      get: (...args) => storeInstance.get(...args),
      getBy: (...args) => storeInstance.getBy(...args),
      list: (...args) => storeInstance.list(...args),
      listBy: (...args) => storeInstance.listBy(...args),
      create() {
        throw new AttemptingToWriteFromSelectorError({ method: 'create' });
      },
      update() {
        throw new AttemptingToWriteFromSelectorError({ method: 'update' });
      },
      updateAllWhere() {
        throw new AttemptingToWriteFromSelectorError({
          method: 'updateAllWhere',
        });
      },
      delete() {
        throw new AttemptingToWriteFromSelectorError({ method: 'delete' });
      },
      deleteAllWhere() {
        throw new AttemptingToWriteFromSelectorError({
          method: 'deleteAllWhere',
        });
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
    throw new SelectorCantBeAsyncError();
  }

  return [result, error];
};
