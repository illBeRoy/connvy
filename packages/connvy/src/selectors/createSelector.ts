import type { SelectorDependencies, SelectorDependencyInstances, SelectorFactory } from './types';

export const createSelector = <TDeps extends SelectorDependencies, TParams extends unknown[], TReturnValue>(
  dependencies: TDeps,
  selectorFn: (dependencies: SelectorDependencyInstances<TDeps>, ...params: TParams) => TReturnValue,
  { fallback }: { fallback?: TReturnValue } = {}
): SelectorFactory<TParams, TReturnValue> => {
  const selector: SelectorFactory<TParams, TReturnValue> = (...params: TParams) => {
    return {
      type: 'selector',
      params,
      dependencies,
      fallback,
      select(dependencies: SelectorDependencyInstances<TDeps>) {
        return selectorFn(dependencies, ...params);
      },
    };
  };

  return selector;
};
