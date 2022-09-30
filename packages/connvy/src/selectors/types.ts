import type { Store, ReadonlyStoreAPI } from '../stores/types';

export interface SelectorFactory<TParams extends unknown[], TReturnValue> {
  (...params: TParams): Selector<TReturnValue>;
}

export interface Selector<TReturnValue = unknown> {
  params: unknown[];
  stores: Record<string, Store>;
  fallback?: TReturnValue;
  select(stores: Record<string, ReadonlyStoreAPI>): TReturnValue;
}

export type SelectorReturnValue<TSelector extends Selector> = TSelector extends Selector<infer TReturnValue>
  ? TReturnValue
  : never;
