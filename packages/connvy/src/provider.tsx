import React, { createContext, useContext, useRef } from 'react';
import type { Store, StoreInstanceOf } from './stores/types';
import { NotRunningInContextError } from './errors';

export interface ConnvyProviderProps {
  children: React.ReactNode;
}

export interface ConnvyProviderContext {
  getStoreInstance<TStore extends Store>(store: TStore): StoreInstanceOf<TStore>;
}

export const ConnvyContext = createContext<ConnvyProviderContext | null>(null);

export const ConnvyProvider = ({ children }: ConnvyProviderProps) => {
  const storeInstances = useRef(new Map<Store, ReturnType<Store['create']>>());

  const getStoreInstance = <TStore extends Store>(store: TStore): StoreInstanceOf<TStore> => {
    const storeInstance = storeInstances.current.get(store);

    if (storeInstance) {
      return storeInstance as StoreInstanceOf<TStore>;
    } else {
      const newStoreInstance = store.create();
      storeInstances.current.set(store, newStoreInstance);
      return newStoreInstance as StoreInstanceOf<TStore>;
    }
  };

  return <ConnvyContext.Provider value={{ getStoreInstance }}>{children}</ConnvyContext.Provider>;
};

export const useConnvy = () => {
  const connvyContext = useContext(ConnvyContext);

  if (!connvyContext) {
    throw new NotRunningInContextError();
  }

  return connvyContext;
};
