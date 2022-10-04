import type { PublicStoreInstanceAPI, Store, StoreInstance, StoreInstanceOf } from './stores/types';
import { ReadOnlyStoreInstanceImpl } from './stores/readOnlyStoreInstance';
import type { Selector } from './selectors/types';
import type { Action, ActionIsAsync, ActionState } from './actions/types';
import { actionStateStore } from './actions/actionStateStore';
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
    const stores = this.collectStoreInstancesAsReadOnly(selector.stores);

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
    this.lockStores(Object.values(action.stores));

    const storesInstances = this.collectStoreInstancesAsClones(action.stores);

    return this.runSyncOrAsyncAction(action, storesInstances, (error) => {
      if (this.ongoingAction !== action) {
        return;
      }

      this.ongoingAction = null;
      this.unlockStores(Object.values(action.stores));
      if (error) {
        this.updateActionState({ state: 'ERROR', actionName: action.name, error });
        throw error;
      } else {
        for (const [key, store] of Object.entries(action.stores)) {
          this.getOrCreateStoreInstance(store).merge(storesInstances[key]);
        }

        this.updateActionState({ state: 'COMPLETED', actionName: action.name, error: null });
      }
    });
  }

  cancelAction({ onlyIf = () => true }: { onlyIf?: (actionName: string) => boolean } = {}) {
    if (this.ongoingAction && onlyIf(this.ongoingAction.name)) {
      this.updateActionState({ state: 'CANCELED', actionName: this.ongoingAction.name, error: null });
      this.ongoingAction = null;
    }
  }

  private runSyncOrAsyncAction<TAction extends Action>(
    action: TAction,
    stores: Record<string, PublicStoreInstanceAPI>,
    andThen: (err?: unknown | null) => void
  ): ActionIsAsync<TAction> {
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

  private collectStoreInstances(
    stores: Record<string, Store>,
    { clone }: { clone?: { as?: (store: Store) => StoreInstance } | true } = {}
  ): Record<string, StoreInstance> {
    const storeInstances: Record<string, StoreInstance> = {};

    for (const [key, store] of Object.entries(stores)) {
      const instance = this.getOrCreateStoreInstance(store);

      const shouldClone = clone === true;
      if (shouldClone) {
        storeInstances[key] = instance.clone();
        continue;
      }

      const shouldCloneAs = clone?.as;
      if (shouldCloneAs) {
        storeInstances[key] = instance.clone({ as: () => clone.as!(store) });
        continue;
      }

      storeInstances[key] = instance;
    }

    return storeInstances;
  }

  private collectStoreInstancesAsReadOnly(stores: Record<string, Store>): Record<string, StoreInstance> {
    return this.collectStoreInstances(stores, {
      clone: {
        as: (store) => new ReadOnlyStoreInstanceImpl(store.name, store.schema),
      },
    });
  }

  private collectStoreInstancesAsClones(stores: Record<string, Store>): Record<string, StoreInstance> {
    return this.collectStoreInstances(stores, {
      clone: true,
    });
  }

  private updateActionState(actionState: ActionState) {
    const actionStates = this.getOrCreateStoreInstance(actionStateStore);

    try {
      actionStates.replace(0, actionState);
    } catch (err) {
      actionStates.create(actionState);
    }
  }

  private lockStores(stores: Store[]) {
    stores.forEach((store) => this.getOrCreateStoreInstance(store).lock());
  }

  private unlockStores(stores: Store[]) {
    stores.forEach((store) => this.getOrCreateStoreInstance(store).unlock());
  }
}
