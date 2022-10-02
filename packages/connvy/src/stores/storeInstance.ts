import EventEmitter from 'event-emitter';
import { ItemNotFoundInStoreError, ItemNotMatchedInStoreError } from '../errors';
import { SchemaParser, StoreInstance } from './types';

export class StoreInstanceImpl<TEntity> implements StoreInstance<TEntity> {
  protected collection: TEntity[] = [];
  protected readonly storeName: string;
  protected readonly eventEmitter = EventEmitter();
  protected readonly parseSchema: SchemaParser<TEntity>;

  constructor(storeName: string, schema: SchemaParser<TEntity>) {
    this.storeName = storeName;
    this.parseSchema = schema;
  }

  create(entity: TEntity): TEntity {
    const validatedEntity = this.parseSchema(entity);
    Object.freeze(validatedEntity);

    this.collection.push(validatedEntity);
    this.eventEmitter.emit('stateChanged');

    return validatedEntity;
  }

  get(i: number, opts?: { fallback?: TEntity }): TEntity {
    if (i in this.collection) {
      return this.collection[i];
    } else if (opts && 'fallback' in opts && opts.fallback !== undefined) {
      return opts.fallback;
    } else {
      throw new ItemNotFoundInStoreError({
        storeName: this.storeName,
        method: 'get',
        index: i,
        collectionSize: this.collection.length,
      });
    }
  }

  getBy(matcher: (item: TEntity) => boolean, opts?: { fallback?: TEntity }): TEntity {
    const matchedItem = this.collection.find(matcher);

    if (matchedItem !== undefined) {
      return matchedItem;
    } else if (opts && 'fallback' in opts && opts.fallback !== undefined) {
      return opts.fallback;
    } else {
      throw new ItemNotMatchedInStoreError({ storeName: this.storeName });
    }
  }

  list(): TEntity[] {
    return [...this.collection];
  }

  listBy(matcher: (item: TEntity) => boolean): TEntity[] {
    return this.collection.filter(matcher);
  }

  update(i: number, updates: Partial<TEntity>): TEntity {
    if (!(i in this.collection)) {
      throw new ItemNotFoundInStoreError({
        storeName: this.storeName,
        method: 'update',
        index: i,
        collectionSize: this.collection.length,
      });
    }

    const updatedItem = this.parseSchema({
      ...this.collection[i],
      ...updates,
    });
    Object.freeze(updatedItem);

    this.collection[i] = updatedItem;
    this.eventEmitter.emit('stateChanged');

    return updatedItem;
  }

  updateAllWhere(matcher: (item: TEntity) => boolean, updates: Partial<TEntity>): number {
    let affectedItems = 0;

    this.collection.forEach((item, i) => {
      if (matcher(item)) {
        const updatedItem = this.parseSchema({ ...item, ...updates });
        Object.freeze(updatedItem);

        this.collection[i] = updatedItem;

        affectedItems += 1;
      }
    });

    if (affectedItems > 0) {
      this.eventEmitter.emit('stateChanged');
    }

    return affectedItems;
  }

  replace(i: number, entity: TEntity): TEntity {
    if (!(i in this.collection)) {
      throw new ItemNotFoundInStoreError({
        storeName: this.storeName,
        method: 'replace',
        index: i,
        collectionSize: this.collection.length,
      });
    }

    const validatedEntity = this.parseSchema(entity);
    Object.freeze(validatedEntity);

    this.collection[i] = validatedEntity;
    this.eventEmitter.emit('stateChanged');

    return validatedEntity;
  }

  delete(i: number): void {
    if (i in this.collection) {
      this.collection.splice(i, 1);
      this.eventEmitter.emit('stateChanged');
    } else {
      throw new ItemNotFoundInStoreError({
        storeName: this.storeName,
        method: 'delete',
        index: i,
        collectionSize: this.collection.length,
      });
    }
  }

  deleteAllWhere(matcher: (item: TEntity) => boolean): number {
    const sizeBeforeDeletion = this.collection.length;
    this.collection = this.collection.filter((item) => !matcher(item));
    const sizeAfterDeletion = this.collection.length;

    const affectedItems = sizeBeforeDeletion - sizeAfterDeletion;

    if (affectedItems > 0) {
      this.eventEmitter.emit('stateChanged');
    }

    return affectedItems;
  }

  clone(opts?: { as?: (() => StoreInstance<TEntity>) | undefined } | undefined): StoreInstance<TEntity> {
    const newInstance = opts?.as?.() ?? new StoreInstanceImpl(this.storeName, this.parseSchema);
    newInstance.merge(this);
    return newInstance;
  }

  merge(from: StoreInstance<TEntity>): void {
    this.collection = [...from.list()];
  }

  on<TEvent extends 'stateChanged'>(event: TEvent, cb: () => void): void {
    this.eventEmitter.on(event, cb);
  }

  off<TEvent extends 'stateChanged'>(event: TEvent, cb: () => void): void {
    this.eventEmitter.off(event, cb);
  }
}
