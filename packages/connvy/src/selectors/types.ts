import type { Store, ReadonlyStoreInstanceOf } from '../stores/types';
import type { Tool, ToolInstance } from '../tools/types';

export interface SelectorFactory<TParams extends unknown[], TReturnValue> {
  (...params: TParams): Selector<TReturnValue>;
}

export interface Selector<TReturnValue = unknown> {
  type: 'selector';
  params: unknown[];
  dependencies: SelectorDependencies;
  fallback?: TReturnValue;
  select(dependencies: SelectorDependencyInstances): TReturnValue;
}

export type SelectorReturnValue<TSelector extends Selector> = TSelector extends Selector<infer TReturnValue>
  ? TReturnValue
  : never;

export type SelectorDependencies = Record<string, Store | Tool>;

export type SelectorDependencyInstances<TDeps extends SelectorDependencies = SelectorDependencies> = {
  [TKey in keyof TDeps]: TDeps[TKey] extends Store
    ? ReadonlyStoreInstanceOf<TDeps[TKey]>
    : TDeps[TKey] extends Tool
    ? ToolInstance<TDeps[TKey]>
    : unknown;
};
