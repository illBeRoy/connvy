import type { Store, PublicStoreInstanceAPI } from '../stores/types';

export interface ActionFactory<TParams extends unknown[], TAsync extends void | Promise<void>> {
  (...params: TParams): Action<TAsync>;
  actionName: string;
}

export interface Action<TAsync extends void | Promise<void> = void | Promise<void>> {
  name: string;
  params: unknown[];
  stores: Record<string, Store>;
  run(stores: Record<string, PublicStoreInstanceAPI>): TAsync;
}

export type ActionIsAsync<TAction extends Action> = TAction extends Action<infer TAsync> ? TAsync : never;
