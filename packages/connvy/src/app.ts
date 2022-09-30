import type { ReadonlyStoreAPI, Store, StoreInstance, StoreInstanceOf } from './stores/types';
import type { Selector } from './selectors/types';
import { ReadOnlyStoreInstanceImpl } from './stores/readOnlyStoreInstance';
import { AttemptingToWriteFromSelectorError, SelectorCantBeAsyncError, StoreIsReadOnlyError } from './errors';

export class ConnvyApp {
  private readonly storeInstances = new Map<Store, StoreInstance>();

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
}
