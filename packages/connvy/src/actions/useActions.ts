import { useConnvy } from '../provider';
import type { Action, ActionFactory, ActionIsAsync } from './types';

export const useActions = () => {
  const connvy = useConnvy();

  const run = <TAction extends Action>(action: TAction): ActionIsAsync<TAction> => {
    return connvy.app.runAction(action);
  };

  const cancel = (actionOrActionsToCancel?: ActionFactory | ActionFactory[]) => {
    const shouldCancelAction = (actionName: string) => {
      const shouldCancelAnyRunningAction = !actionOrActionsToCancel;
      if (shouldCancelAnyRunningAction) {
        return true;
      }

      const oneActionToCancel = !(actionOrActionsToCancel instanceof Array);
      if (oneActionToCancel) {
        return actionOrActionsToCancel.actionName === actionName;
      }

      const multipleActionsToCancel = actionOrActionsToCancel instanceof Array;
      if (multipleActionsToCancel) {
        return actionOrActionsToCancel.some((action) => action.actionName === actionName);
      }

      return false;
    };

    connvy.app.cancelAction({
      onlyIf: shouldCancelAction,
    });
    return { run };
  };

  return {
    run,
    cancel,
  };
};
