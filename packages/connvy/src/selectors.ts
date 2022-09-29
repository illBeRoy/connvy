import { useEffect, useMemo, useState } from 'react';
import { AttemptingToWriteFromSelectorError, SelectorCantBeAsyncError } from './errors';
import { useConnvy } from './provider';
import type { Store, ReadonlyStoreAPI, PublicStoreAPI } from './stores';

export interface SelectorFactory<TParams extends any[], TReturnValue> {
  (...params: TParams): Selector<TReturnValue>;
}

export interface Selector<TReturnValue> {
  params: unknown[];
  stores: Record<string, Store>;
  fallback?: TReturnValue;
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
      [TKey in keyof TStores]: ReadonlyStoreAPI<ReturnType<TStores[TKey]['schema']>>;
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
        [TKey in keyof TStores]: ReadonlyStoreAPI<ReturnType<TStores[TKey]['schema']>>;
      }) {
        return selectorFn(stores, ...params);
      },
    };
  };

  return selector;
};

export const useSelector = <T>(selector: Selector<T>): [T | null, unknown | null] => {
  const connvy = useConnvy();
  const [memoizationKey, setMemoizationKey] = useState(Math.random());

  const updateMemoizationKey = () => setMemoizationKey(Math.random());

  useEffect(function updateMemoizationKeyWhenAnyDependentStoreChanged() {
    const allStoresForSelector = Object.values(selector.stores);
    const allStoreInstances = allStoresForSelector.map(connvy.getStoreStateContainer);

    allStoreInstances.forEach((storeInstance) => {
      storeInstance.on('stateChanged', updateMemoizationKey);
    });

    return function onUnmount() {
      allStoreInstances.forEach((storeInstance) => {
        storeInstance.off('stateChanged', updateMemoizationKey);
      });
    };
  }, []);

  const [result, error] = useMemo(() => {
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

    const isSelectorAsync = result instanceof Promise;
    if (isSelectorAsync) {
      throw new SelectorCantBeAsyncError();
    }

    const isErrorAResultOfMisuse = error instanceof AttemptingToWriteFromSelectorError;
    if (isErrorAResultOfMisuse) {
      throw error;
    }

    if (error && selector.fallback !== undefined) {
      result = selector.fallback;
      error = null;
    }

    return [result, error];
  }, [memoizationKey, ...selector.params]);

  return [result, error];
};
