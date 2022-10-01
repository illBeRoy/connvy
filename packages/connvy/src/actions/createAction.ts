import type { PublicStoreInstanceOf, Store } from '../stores/types';
import { ActionFactory } from './types';

export const createAction = <
  TStores extends Record<string, Store>,
  TParams extends unknown[],
  TAsync extends void | Promise<void>
>(
  name: string,
  stores: TStores,
  actionFn: (
    stores: {
      [TKey in keyof TStores]: PublicStoreInstanceOf<TStores[TKey]>;
    },
    ...params: TParams
  ) => TAsync
): ActionFactory<TParams, TAsync> => {
  const action: ActionFactory<TParams, TAsync> = (...params) => {
    return {
      name,
      params,
      stores,
      run(stores: {
        [TKey in keyof TStores]: PublicStoreInstanceOf<TStores[TKey]>;
      }) {
        return actionFn(stores, ...params);
      },
    };
  };

  action.actionName = name;

  return action;
};
