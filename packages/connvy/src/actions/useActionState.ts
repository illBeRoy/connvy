import type { ActionState } from './types';

export const useActionState = (): ActionState => {
  return {
    state: 'IDLE',
    actionName: '',
    error: null,
  };
};
