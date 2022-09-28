import z from 'zod';
import EventEmitter from 'event-emitter';

export interface Store<TSchema extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  schema: SchemaFactory<TSchema>;
  create(): StoreStateContainer<TSchema>;
}

export type PublicStoreAPI<TSchema extends Record<string, any> = any> = Omit<
  StoreStateContainer<TSchema>,
  'on' | 'off'
>;

export type ReadonlyStoreAPI<TSchema extends Record<string, any> = any> = Omit<
  PublicStoreAPI<TSchema>,
  'create' | 'update' | 'updateAllWhere' | 'delete' | 'deleteAllWhere'
>;

export class StoreStateContainer<TSchema extends z.ZodRawShape> {
  private readonly collection: z.infer<z.ZodObject<TSchema>>[] = [];
  private readonly eventEmitter = EventEmitter();
  private readonly schema: z.ZodObject<TSchema>;

  constructor(schemaFactory: SchemaFactory<TSchema>) {
    this.schema = z.object(schemaFactory(z));
  }

  create(entity: z.infer<typeof this.schema>): z.infer<typeof this.schema> {
    const validatedEntity = this.schema.parse(entity);

    this.collection.push(this.schema.parse(validatedEntity));
    this.eventEmitter.emit('stateChanged');

    return validatedEntity;
  }

  get(
    i: number,
    opts?: { fallback?: z.infer<z.ZodObject<TSchema>> }
  ): z.infer<typeof this.schema> {
    if (i in this.collection) {
      return this.collection[i];
    } else if (opts && 'fallback' in opts && opts.fallback !== undefined) {
      return opts.fallback;
    } else {
      throw new Error(
        `No item was found at index ${i} (collection has ${this.collection.length} items, and the index we use in "get" is zero-based)`
      );
    }
  }

  getBy(
    matcher: (item: z.infer<typeof this.schema>) => boolean,
    opts?: { fallback?: z.infer<z.ZodObject<TSchema>> }
  ): z.infer<typeof this.schema> {
    const matchedItem = this.collection.find(matcher);

    if (matchedItem !== undefined) {
      return matchedItem;
    } else if (opts && 'fallback' in opts && opts.fallback !== undefined) {
      return opts.fallback;
    } else {
      throw new Error('No item in the collection matches the search criteria');
    }
  }

  list(): z.infer<typeof this.schema>[] {
    return [...this.collection];
  }

  listBy(
    matcher: (item: z.infer<typeof this.schema>) => boolean
  ): z.infer<typeof this.schema>[] {
    return this.collection.filter(matcher);
  }

  update(
    i: number,
    updates: Partial<z.infer<typeof this.schema>>
  ): z.infer<typeof this.schema> {
    if (!(i in this.collection)) {
      throw new Error(
        `Could not update item at index ${i} (collection has ${this.collection.length} items, and the index we use in "update" is zero-based)`
      );
    }

    const updatedItem = this.schema.parse({
      ...this.collection[i],
      ...updates,
    });

    this.collection[i] = updatedItem;
    this.eventEmitter.emit('stateChanged');

    return updatedItem;
  }

  updateAllWhere(
    matcher: (item: z.infer<typeof this.schema>) => boolean,
    updates: Partial<z.infer<typeof this.schema>>
  ): number {
    let affectedItems = 0;

    this.collection.forEach((item, i) => {
      if (matcher(item)) {
        this.collection[i] = this.schema.parse({ ...item, ...updates });
        affectedItems += 1;
      }
    });

    if (affectedItems > 0) {
      this.eventEmitter.emit('stateChanged');
    }

    return affectedItems;
  }

  delete(i: number) {
    if (i in this.collection) {
      this.collection.splice(i, 1);
      this.eventEmitter.emit('stateChanged');
    } else {
      throw new Error(
        `Could not delete item at index ${i} (collection has ${this.collection.length} items, and the index we use in "delete" is zero-based)`
      );
    }
  }

  deleteAllWhere(
    matcher: (item: z.infer<typeof this.schema>) => boolean
  ): number {
    let affectedItems = 0;

    for (let i = 0; i < this.collection.length; i += 1) {
      if (matcher(this.collection[i])) {
        this.collection.splice(i, 1);
        i -= 1;
        affectedItems += 1;
      }
    }

    if (affectedItems > 0) {
      this.eventEmitter.emit('stateChanged');
    }

    return affectedItems;
  }

  on(event: 'stateChanged', cb: () => void) {
    this.eventEmitter.on(event, cb);
  }

  off(event: 'stateChanged', cb: () => void) {
    this.eventEmitter.off(event, cb);
  }
}

export const createStore = <TSchema extends z.ZodRawShape>({
  name,
  schema,
}: {
  name: string;
  schema: SchemaFactory<TSchema>;
}): Store<TSchema> => {
  return {
    name,
    schema,
    create() {
      return new StoreStateContainer(schema);
    },
  };
};

type SchemaFactory<TSchema> = ($: typeof z) => TSchema;

export type EntityType<TStore extends Store<z.ZodRawShape>> = z.infer<
  z.ZodObject<ReturnType<TStore['schema']>>
>;
