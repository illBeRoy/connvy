import React, { createContext, useContext, useRef } from 'react';
import type { Store, StoreInstanceOf } from './stores/types';
import { NotRunningInContextError } from './errors';
import { ConnvyApp } from './app';

export interface ConnvyProviderProps {
  children: React.ReactNode;
}

export interface ConnvyProviderContext {
  app: ConnvyApp;
}

export const ConnvyContext = createContext<ConnvyProviderContext | null>(null);

export const ConnvyProvider = ({ children }: ConnvyProviderProps) => {
  const app = useRef(new ConnvyApp());

  const context: ConnvyProviderContext = {
    app: app.current,
  };

  return <ConnvyContext.Provider value={context}>{children}</ConnvyContext.Provider>;
};

export const useConnvy = () => {
  const connvyContext = useContext(ConnvyContext);

  if (!connvyContext) {
    throw new NotRunningInContextError();
  }

  return connvyContext;
};
