import { useConnvy } from '../provider';
import type { Tool, ToolInstance } from './types';

export const useTool = <TTool extends Tool>(tool: TTool): ToolInstance<TTool> => {
  const connvy = useConnvy();
  return connvy.app.getOrCreateToolInstance(tool);
};
