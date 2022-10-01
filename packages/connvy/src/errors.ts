import { Action } from './actions/types';

export class ConnvyError extends Error {}

export class NotRunningInContextError extends ConnvyError {
  constructor() {
    super('Connvy was not initialized in context. Please wrap your app with the <ConnvyProvider /> component');
  }
}

export class ItemNotFoundInStoreError extends ConnvyError {
  constructor({
    storeName,
    method,
    index,
    collectionSize,
  }: {
    storeName: string;
    method: string;
    index: number;
    collectionSize: number;
  }) {
    super(
      `Could not find item at index ${index} in store "${storeName}" (collection has ${collectionSize} items, and the index we use in "${method}" is zero-based)`
    );
  }
}

export class ItemNotMatchedInStoreError extends ConnvyError {
  constructor({ storeName }: { storeName: string }) {
    super(`No item in the collection matches the search criteria in store "${storeName}"`);
  }
}

export class StoreIsReadOnlyError extends ConnvyError {
  storeName: string;
  method: string;
  constructor({ storeName, method }: { storeName: string; method: string }) {
    super(
      `Tried to write into a Read Only instance of a store (tried to use the "${method}" method on store "${storeName})"`
    );
    this.storeName = storeName;
    this.method = method;
  }
}

export class AttemptingToWriteFromSelectorError extends ConnvyError {
  constructor({ storeName, method }: { storeName: string; method: string }) {
    super(`Stores are read-only in selectors (tried to use the "${method}" method on store "${storeName})"`);
  }
}

export class SelectorCantBeAsyncError extends ConnvyError {
  constructor() {
    super('Selectors cannot use async functions or return promises');
  }
}

export class OngoingActionError extends ConnvyError {
  readonly ongoingAction: Action;
  readonly incomingAction: Action;

  constructor({ ongoingAction, incomingAction }: { ongoingAction: Action; incomingAction: Action }) {
    super(
      '\n' +
        '  cannot invoke action\n' +
        `    ${OngoingActionError.formatActionIntoStr(incomingAction)}\n` +
        '  as there is a currently ongoing action\n' +
        `    ${OngoingActionError.formatActionIntoStr(ongoingAction)}\n` +
        '  if you want the new action to take precedence, please cancel the ongoing one first'
    );
    this.ongoingAction = ongoingAction;
    this.incomingAction = incomingAction;
  }

  private static formatActionIntoStr(action: Action) {
    const actionParams = JSON.stringify(action.params).slice(1, -1);
    const formattedActionParams = actionParams.length <= 80 ? actionParams : `${actionParams.substring(0, 80)}...`;
    return `${action.name}(${formattedActionParams})`;
  }
}
