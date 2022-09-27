import { useEffect, useState } from 'react';
import { useConnvy } from './provider';
import { Store, StoreStateContainer } from './stores';

export const useStore = <TSchema extends Record<string, any>>(
  store: Store<TSchema>
): Omit<StoreStateContainer<TSchema>, 'on' | 'off'> => {
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
