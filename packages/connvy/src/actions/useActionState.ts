import { useStore } from '../stores/useStore';
import { actionStateStore } from './actionStateStore';
import type { ActionFactory, ActionState } from './types';

export const useActionState = (
  actionOrActionsToWatch?: ActionFactory<any, any> | ActionFactory<any, any>[]
): ActionState => {
  const watch: 'ALL' | string[] =
    actionOrActionsToWatch instanceof Array
      ? actionOrActionsToWatch.map((action) => action.actionName)
      : actionOrActionsToWatch
      ? [actionOrActionsToWatch.actionName]
      : 'ALL';

  const actionStates = useStore(actionStateStore);
  const actionState = actionStates.get(0, { fallback: { state: 'IDLE', actionName: '', error: null } });

  if (watch === 'ALL' || watch.includes(actionState.actionName)) {
    return actionState;
  } else {
    return {
      state: 'IDLE',
      actionName: '',
      error: null,
    };
  }
};
