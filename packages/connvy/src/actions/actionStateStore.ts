import { createStore } from '../stores/createStore';
import type { Store } from '../stores/types';
import type { ActionState } from './types';

export const actionStateStore: Store<ActionState> = createStore('__connvy_actionState__', {
  schema: ($) => ({
    state: $.enum(['IDLE', 'ONGOING', 'ERROR', 'COMPLETED', 'CANCELED']),
    actionName: $.string().default(''),
    error: $.unknown().nullable(),
  }),
});
