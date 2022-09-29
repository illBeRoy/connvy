import React, { createContext, useContext, useRef } from 'react';
import { NotRunningInContextError } from './errors';
import { Store, StoreStateContainer } from './stores';

export interface ConnvyProviderProps {
  children: React.ReactNode;
}

export interface ConnvyProviderContext {
  getStoreStateContainer<T extends Record<string, any>>(
    store: Store<T>
  ): StoreStateContainer<T>;
}

export const ConnvyContext = createContext<ConnvyProviderContext | null>(null);

export const ConnvyProvider = ({ children }: ConnvyProviderProps) => {
  const storesStateContainers = useRef(
    new Map<Store, ReturnType<Store['create']>>()
  );

  const getStoreStateContainer = <T extends Record<string, any>>(
    store: Store<T>
  ): StoreStateContainer<T> => {
    const storeStateContainer = storesStateContainers.current.get(store);

    if (storeStateContainer) {
      return storeStateContainer as StoreStateContainer<T>;
    } else {
      const newStateContainer = store.create();
      storesStateContainers.current.set(store, newStateContainer);
      return newStateContainer;
    }
  };

  return (
    <ConnvyContext.Provider value={{ getStoreStateContainer }}>
      {children}
    </ConnvyContext.Provider>
  );
};

export const useConnvy = () => {
  const connvyContext = useContext(ConnvyContext);

  if (!connvyContext) {
    throw new NotRunningInContextError();
  }

  return connvyContext;
};
