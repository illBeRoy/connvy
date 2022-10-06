import { useEffect, useMemo, useState } from 'react';
import { useConnvy } from '../provider';
import { Store } from '../stores/types';
import type { Selector } from './types';

export const useSelector = <T>(selector: Selector<T>): [result: T | null, error: unknown | null] => {
  const connvy = useConnvy();

  const [memoizationKey, setMemoizationKey] = useState(Math.random());
  const updateMemoizationKey = () => setMemoizationKey(Math.random());

  useEffect(function updateMemoizationKeyWhenAnyDependentStoreChanged() {
    const allStoresForSelector = Object.values(selector.dependencies).filter((dep) => dep.type === 'store') as Store[];
    const allStoreInstances = allStoresForSelector.map((store) => connvy.app.getOrCreateStoreInstance(store));

    allStoreInstances.forEach((storeInstance) => {
      storeInstance.on('stateChanged', updateMemoizationKey);
    });

    return function onUnmount() {
      allStoreInstances.forEach((storeInstance) => {
        storeInstance.off('stateChanged', updateMemoizationKey);
      });
    };
  }, []);

  const [result, error] = useMemo(() => connvy.app.select(selector), [memoizationKey, ...selector.params]);
  return [result, error];
};
