import { useStore } from '../stores/useStore';
import { actionStateStore } from './actionStateStore';
import type { ActionState } from './types';

export const useActionState = (): ActionState => {
  const actionState = useStore(actionStateStore);
  return actionState.get(0, { fallback: { state: 'IDLE', actionName: '', error: null } });
};
