import z from 'zod';
import { StoreInstanceImpl } from './storeInstance';
import type { Store } from './types';

export const createStore = <TSchema extends z.ZodRawShape>(
  name: string,
  {
    schema,
  }: {
    schema: ($: typeof z) => TSchema;
  }
): Store<z.infer<z.ZodObject<TSchema>>> => {
  const schemaParser = (obj: unknown) => {
    return z.object(schema(z)).parse(obj);
  };

  return {
    type: 'store',
    name,
    schema: schemaParser,
    create() {
      return new StoreInstanceImpl(name, schemaParser);
    },
  };
};
