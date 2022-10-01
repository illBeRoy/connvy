import { useConnvy } from '../provider';
import type { Action, ActionIsAsync } from './types';

export const useActions = () => {
  const connvy = useConnvy();

  const run = <TAction extends Action>(action: TAction): ActionIsAsync<TAction> => {
    return connvy.app.runAction(action);
  };

  return {
    run,
  };
};
