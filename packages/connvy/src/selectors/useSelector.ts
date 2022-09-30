import { useEffect, useMemo, useState } from 'react';
import type { ReadonlyStoreAPI, PublicStoreInstanceAPI } from '../stores/types';
import { useConnvy } from '../provider';
import { AttemptingToWriteFromSelectorError, SelectorCantBeAsyncError } from '../errors';
import type { Selector } from './types';

export const useSelector = <T>(selector: Selector<T>): [T | null, unknown | null] => {
  const connvy = useConnvy();
  const [memoizationKey, setMemoizationKey] = useState(Math.random());

  const updateMemoizationKey = () => setMemoizationKey(Math.random());

  useEffect(function updateMemoizationKeyWhenAnyDependentStoreChanged() {
    const allStoresForSelector = Object.values(selector.stores);
    const allStoreInstances = allStoresForSelector.map(connvy.getStoreInstance);

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
      const storeInstance = connvy.getStoreInstance(store);

      const storeInstanceThatIsReadOnly: PublicStoreInstanceAPI = {
        get: (...args) => storeInstance.get(...args),
        getBy: (...args) => storeInstance.getBy(...args),
        list: (...args) => storeInstance.list(...args),
        listBy: (...args) => storeInstance.listBy(...args),
        create() {
          throw new AttemptingToWriteFromSelectorError({ storeName: store.name, method: 'create' });
        },
        update() {
          throw new AttemptingToWriteFromSelectorError({ storeName: store.name, method: 'update' });
        },
        updateAllWhere() {
          throw new AttemptingToWriteFromSelectorError({
            storeName: store.name,
            method: 'updateAllWhere',
          });
        },
        delete() {
          throw new AttemptingToWriteFromSelectorError({ storeName: store.name, method: 'delete' });
        },
        deleteAllWhere() {
          throw new AttemptingToWriteFromSelectorError({
            storeName: store.name,
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
