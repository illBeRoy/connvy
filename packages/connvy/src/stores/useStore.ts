import { useEffect, useState } from 'react';
import { useConnvy } from '../provider';
import { PublicStoreInstanceOf, Store } from './types';

export const useStore = <TStore extends Store>(store: TStore): PublicStoreInstanceOf<TStore> => {
  const connvy = useConnvy();
  const storeStateContainer = connvy.getStoreInstance(store);

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
