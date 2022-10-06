import type { PublicStoreInstanceOf } from '../stores/types';
import { ActionDependencies, ActionDependencyInstances, ActionFactory } from './types';

export const createAction = <
  TDeps extends ActionDependencies,
  TParams extends unknown[],
  TAsync extends void | Promise<void>
>(
  name: string,
  dependencies: TDeps,
  actionFn: (dependencies: ActionDependencyInstances<TDeps>, ...params: TParams) => TAsync
): ActionFactory<TParams, TAsync> => {
  const action: ActionFactory<TParams, TAsync> = (...params) => {
    return {
      type: 'action',
      name,
      params,
      dependencies,
      run(dependencies: ActionDependencyInstances<TDeps>) {
        return actionFn(dependencies, ...params);
      },
    };
  };

  action.actionName = name;

  return action;
};
