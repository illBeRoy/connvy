import { useEffect, useState } from 'react';
import { useConnvy } from './provider';
import { Store, StoreStateContainer } from './stores';

export type UseStoreHook<TSchema extends Record<string, any>> = Omit<
  StoreStateContainer<TSchema>,
  'on' | 'off'
>;

export const useStore = <TSchema extends Record<string, any>>(
  store: Store<TSchema>
): UseStoreHook<TSchema> => {
  const connvy = useConnvy();
  const storeStateContainer = connvy.getStoreStateContainer(store);

  const [_, setRerenderState] = useState(Math.random());

  function rerenderMe() {
    setRerenderState(Math.random());
  }

  useEffect(function onMount() {
    storeStateContainer.on('stateChanged', rerenderMe);

    return function onUnmount() {
      storeStateContainer.off('stateChanged', rerenderMe);
    };
  }, []);

  return storeStateContainer;
};
