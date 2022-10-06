export interface Tool<TInstance = unknown> {
  type: 'tool';
  name: string;
  create(): TInstance;
}

export type ToolInstance<TTool extends Tool = Tool> = TTool extends Tool<infer TInstance> ? TInstance : never;
