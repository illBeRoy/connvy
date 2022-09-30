import type { Store, ReadonlyStoreAPI } from '../stores/types';

export interface SelectorFactory<TParams extends any[], TReturnValue> {
  (...params: TParams): Selector<TReturnValue>;
}

export interface Selector<TReturnValue> {
  params: unknown[];
  stores: Record<string, Store>;
  fallback?: TReturnValue;
  select(stores: Record<string, ReadonlyStoreAPI>): TReturnValue;
}
