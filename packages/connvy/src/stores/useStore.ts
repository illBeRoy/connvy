import { useEffect, useState } from 'react';
import { useConnvy } from '../provider';
import { PublicStoreInstanceOf, Store } from './types';

export const useStore = <TStore extends Store>(store: TStore): PublicStoreInstanceOf<TStore> => {
  const connvy = useConnvy();
  const storeInstance = connvy.app.getOrCreateStoreInstance(store);

  const [_, setRerenderState] = useState(Math.random());

  function rerenderMe() {
    setRerenderState(Math.random());
  }

  useEffect(function onMount() {
    storeInstance.on('stateChanged', rerenderMe);

    return function onUnmount() {
      storeInstance.off('stateChanged', rerenderMe);
    };
  }, []);

  return storeInstance;
};
