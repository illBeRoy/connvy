import type { PublicStoreInstanceAPI, ReadonlyStoreAPI, Store, StoreInstance, StoreInstanceOf } from './stores/types';
import { ReadOnlyStoreInstanceImpl } from './stores/readOnlyStoreInstance';
import type { Selector } from './selectors/types';
import type { Action, ActionIsAsync, ActionState } from './actions/types';
import {
  AttemptingToWriteFromSelectorError,
  OngoingActionError,
  SelectorCantBeAsyncError,
  StoreIsReadOnlyError,
} from './errors';
import { actionStateStore } from './actions/actionStateStore';

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
    const stores = this.collectStoreInstanceAsReadOnly(selector.stores);

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
    this.updateActionState({ state: 'ONGOING', actionName: action.name, error: null });

    return this.runSyncOrAsyncAction(action, (error) => {
      this.ongoingAction = null;
      if (error) {
        this.updateActionState({ state: 'ERROR', actionName: action.name, error });
        throw error;
      } else {
        this.updateActionState({ state: 'COMPLETED', actionName: action.name, error: null });
      }
    });
  }

  private runSyncOrAsyncAction<TAction extends Action>(
    action: TAction,
    andThen: (err?: unknown | null) => void
  ): ActionIsAsync<TAction> {
    const stores: Record<string, PublicStoreInstanceAPI> = this.collectStoreInstance(action.stores);

    let actionResult: void | Promise<void>;

    try {
      actionResult = action.run(stores);
    } catch (err) {
      andThen(err);
      return undefined as ActionIsAsync<TAction>;
    }

    if (actionResult instanceof Promise) {
      return actionResult.then(() => andThen()).catch((err) => andThen(err)) as ActionIsAsync<TAction>;
    } else {
      andThen();
      return undefined as ActionIsAsync<TAction>;
    }
  }

  private collectStoreInstance(stores: Record<string, Store>): Record<string, PublicStoreInstanceAPI> {
    const storeInstances: Record<string, PublicStoreInstanceAPI> = {};

    for (const [key, store] of Object.entries(stores)) {
      const readonlyStoreInstance = this.getOrCreateStoreInstance(store);
      storeInstances[key] = readonlyStoreInstance;
    }

    return storeInstances;
  }

  private collectStoreInstanceAsReadOnly(stores: Record<string, Store>): Record<string, ReadonlyStoreAPI> {
    const storeInstances: Record<string, ReadonlyStoreAPI> = {};

    for (const [key, store] of Object.entries(stores)) {
      const readonlyStoreInstance = this.getOrCreateStoreInstance(store).clone({
        as: () => new ReadOnlyStoreInstanceImpl(store.name, store.schema),
      });
      storeInstances[key] = readonlyStoreInstance;
    }

    return storeInstances;
  }

  private updateActionState(actionState: ActionState) {
    const actionStates = this.getOrCreateStoreInstance(actionStateStore);

    try {
      actionStates.replace(0, actionState);
    } catch (err) {
      actionStates.create(actionState);
    }
  }
}
