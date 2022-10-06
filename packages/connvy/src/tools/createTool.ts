import { Tool } from './types';

export const createTool = <T>(name: string, { create }: { create(): T }): Tool<T> => {
  return {
    type: 'tool',
    name,
    create,
  };
};
