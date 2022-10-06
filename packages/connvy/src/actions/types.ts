import type { Store, PublicStoreInstanceOf } from '../stores/types';
import type { Tool, ToolInstance } from '../tools/types';

export interface ActionFactory<TParams extends unknown[] = any[], TAsync extends void | Promise<void> = void> {
  (...params: TParams): Action<TAsync>;
  actionName: string;
}

export interface Action<TAsync extends void | Promise<void> = void | Promise<void>> {
  type: 'action';
  name: string;
  params: unknown[];
  dependencies: ActionDependencies;
  run(dependencies: ActionDependencyInstances): TAsync;
}

export type ActionIsAsync<TAction extends Action> = TAction extends Action<infer TAsync> ? TAsync : never;

export interface ActionState {
  state: ActionStateState;
  actionName: string;
  error?: null | unknown;
}

export type ActionStateState = 'IDLE' | 'ONGOING' | 'ERROR' | 'COMPLETED' | 'CANCELED';

export type ActionDependencies = Record<string, Store | Tool>;

export type ActionDependencyInstances<TDeps extends ActionDependencies = ActionDependencies> = {
  [TKey in keyof TDeps]: TDeps[TKey] extends Store
    ? PublicStoreInstanceOf<TDeps[TKey]>
    : TDeps[TKey] extends Tool
    ? ToolInstance<TDeps[TKey]>
    : unknown;
};
