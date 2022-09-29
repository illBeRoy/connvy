export class ConnvyError extends Error {}

export class NotRunningInContextError extends ConnvyError {
  constructor() {
    // const prototype = new.target.prototype;
    super('Connvy was not initialized in context. Please wrap your app with the <ConnvyProvider /> component');
    // Object.setPrototypeOf(this, prototype);
  }
}

export class ItemNotFoundInStoreError extends ConnvyError {
  constructor({ method, index, collectionSize }: { method: string; index: number; collectionSize: number }) {
    super(
      `Could not find item at index ${index} (collection has ${collectionSize} items, and the index we use in "${method}" is zero-based)`
    );
  }
}

export class ItemNotMatchedInStoreError extends ConnvyError {
  constructor() {
    super('No item in the collection matches the search criteria');
  }
}

export class AttemptingToWriteFromSelectorError extends ConnvyError {
  constructor({ method }: { method: string }) {
    super(`Stores are read-only in selectors (tried to use the "${method}" method)`);
  }
}

export class SelectorCantBeAsyncError extends ConnvyError {
  constructor() {
    super('Selectors cannot use async functions or return promises');
  }
}
