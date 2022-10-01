import type { PublicStoreInstanceAPI, ReadonlyStoreAPI, Store, StoreInstance, StoreInstanceOf } from './stores/types';
import { ReadOnlyStoreInstanceImpl } from './stores/readOnlyStoreInstance';
import type { Selector } from './selectors/types';
import type { Action, ActionIsAsync } from './actions/types';
import {
  AttemptingToWriteFromSelectorError,
  OngoingActionError,
  SelectorCantBeAsyncError,
  StoreIsReadOnlyError,
} from './errors';

export class ConnvyApp {
  private readonly storeInstances = new Map<Store, StoreInstance>();
  private ongoingAction: Action | null = null;

  getOrCreateStoreInstance<TStore extends Store>(store: TStore): StoreInstanceOf<TStore> {
    const storeInstance = this.storeInstances.get(store);

    if (storeInstance) {
      return storeInstance as StoreInstanceOf<TStore>;
    } else {
      const newStoreInstance = store.create();
      this.storeInstances.set(store, newStoreInstance);
      return newStoreInstance as StoreInstanceOf<TStore>;
    }
  }

  select<TReturnValue>(selector: Selector<TReturnValue>): [result: TReturnValue | null, error: unknown | null] {
    const stores: Record<string, ReadonlyStoreAPI> = {};

    for (const [key, store] of Object.entries(selector.stores)) {
      const readonlyStoreInstance = this.getOrCreateStoreInstance(store).clone({
        as: () => new ReadOnlyStoreInstanceImpl(store.name, store.schema),
      });

      stores[key] = readonlyStoreInstance;
    }

    let result: TReturnValue | null = null,
      error: unknown | null = null;

    try {
      result = selector.select(stores);
    } catch (err) {
      error = err;
    }

    const isSelectorAsync = result instanceof Promise;
    if (isSelectorAsync) {
      throw new SelectorCantBeAsyncError();
    }

    const isErrorBecauseTriedToWriteIntoStores = error instanceof StoreIsReadOnlyError;
    if (isErrorBecauseTriedToWriteIntoStores) {
      const readOnlyError = error as StoreIsReadOnlyError;
      throw new AttemptingToWriteFromSelectorError({
        storeName: readOnlyError.storeName,
        method: readOnlyError.method,
      });
    }

    if (error && selector.fallback !== undefined) {
      result = selector.fallback;
      error = null;
    }

    return [result, error];
  }

  runAction<TAction extends Action>(action: TAction): ActionIsAsync<TAction> {
    if (this.ongoingAction) {
      throw new OngoingActionError({ ongoingAction: this.ongoingAction, incomingAction: action });
    }

    this.ongoingAction = action;

    const stores: Record<string, PublicStoreInstanceAPI> = {};

    for (const [key, store] of Object.entries(action.stores)) {
      const readonlyStoreInstance = this.getOrCreateStoreInstance(store);
      stores[key] = readonlyStoreInstance;
    }

    const actionResult = action.run(stores);

    if (actionResult instanceof Promise) {
      return actionResult.then(() => {
        this.ongoingAction = null;
      }) as ActionIsAsync<TAction>;
    } else {
      this.ongoingAction = null;
      return undefined as ActionIsAsync<TAction>;
    }
  }
}
