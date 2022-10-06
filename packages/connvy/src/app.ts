import type { PublicStoreInstanceAPI, Store, StoreInstance, StoreInstanceOf } from './stores/types';
import { ReadOnlyStoreInstanceImpl } from './stores/readOnlyStoreInstance';
import type { Selector } from './selectors/types';
import type { Action, ActionIsAsync, ActionState } from './actions/types';
import { actionStateStore } from './actions/actionStateStore';
import type { Tool, ToolInstance } from './tools/types';
import {
  AttemptingToWriteFromSelectorError,
  OngoingActionError,
  SelectorCantBeAsyncError,
  StoreIsReadOnlyError,
} from './errors';

export class ConnvyApp {
  private readonly storeInstances = new Map<Store, StoreInstance>();
  private readonly toolInstances = new Map<Tool, ToolInstance>();
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

  getOrCreateToolInstance<TTool extends Tool>(tool: TTool): ToolInstance<TTool> {
    const toolInstance = this.toolInstances.get(tool);

    if (toolInstance) {
      return toolInstance as ToolInstance<TTool>;
    } else {
      const newToolInstance = tool.create();
      this.toolInstances.set(tool, newToolInstance);
      return newToolInstance as ToolInstance<TTool>;
    }
  }

  select<TReturnValue>(selector: Selector<TReturnValue>): [result: TReturnValue | null, error: unknown | null] {
    const dependencies = this.collectDependencies(selector.dependencies, {
      cloneStores: { as: (store) => new ReadOnlyStoreInstanceImpl(store.name, store.schema) },
    });

    let result: TReturnValue | null = null,
      error: unknown | null = null;

    try {
      result = selector.select(dependencies);
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

    const stores = Object.values(action.dependencies).filter((dep) => dep.type === 'store') as Store[];

    this.lockStores(stores);

    const dependencies = this.collectDependencies(action.dependencies, { cloneStores: true });

    return this.runSyncOrAsyncAction(action, dependencies, (error) => {
      if (this.ongoingAction !== action) {
        return;
      }

      this.ongoingAction = null;
      this.unlockStores(Object.values(stores));
      if (error) {
        this.updateActionState({ state: 'ERROR', actionName: action.name, error });
        throw error;
      } else {
        for (const [key, dependency] of Object.entries(action.dependencies)) {
          if (dependency.type === 'store') {
            this.getOrCreateStoreInstance(dependency).merge(dependencies[key] as StoreInstance);
          }
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
    dependencies: Record<string, PublicStoreInstanceAPI | ToolInstance>,
    andThen: (err?: unknown | null) => void
  ): ActionIsAsync<TAction> {
    let actionResult: void | Promise<void>;

    try {
      actionResult = action.run(dependencies);
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

  private collectDependencies(
    dependencies: Record<string, Store | Tool>,
    { cloneStores }: { cloneStores?: { as?: (store: Store) => StoreInstance } | true } = {}
  ): Record<string, StoreInstance | ToolInstance> {
    const dependencyInstances: Record<string, StoreInstance | ToolInstance> = {};

    for (const [key, dependency] of Object.entries(dependencies)) {
      if (dependency.type === 'tool') {
        dependencyInstances[key] = this.getOrCreateToolInstance(dependency);
        continue;
      }

      const storeInstance = this.getOrCreateStoreInstance(dependency);

      const shouldClone = cloneStores === true;
      if (shouldClone) {
        dependencyInstances[key] = storeInstance.clone();
        continue;
      }

      const shouldCloneAs = cloneStores && typeof cloneStores !== 'boolean' && 'as' in cloneStores;
      if (shouldCloneAs) {
        dependencyInstances[key] = storeInstance.clone({ as: () => cloneStores.as!(dependency) });
        continue;
      }

      dependencyInstances[key] = storeInstance;
    }

    return dependencyInstances;
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
