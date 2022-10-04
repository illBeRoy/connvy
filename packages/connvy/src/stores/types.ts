export interface Store<TEntity = unknown> {
  name: string;
  schema: SchemaParser<TEntity>;
  create(): StoreInstance<TEntity>;
}

export interface StoreInstance<TEntity = unknown> {
  create(entity: TEntity): TEntity;
  get(i: number, opts?: { fallback?: TEntity }): TEntity;
  getBy(matcher: (item: TEntity) => boolean, opts?: { fallback?: TEntity }): TEntity;
  list(): TEntity[];
  listBy(matcher: (item: TEntity) => boolean): TEntity[];
  update(i: number, updates: Partial<TEntity>): TEntity;
  updateAllWhere(matcher: (item: TEntity) => boolean, updates: Partial<TEntity>): number;
  replace(i: number, entity: TEntity): TEntity;
  delete(i: number): void;
  deleteAllWhere(matcher: (item: TEntity) => boolean): number;
  clone(opts?: { as?: () => StoreInstance<TEntity> }): StoreInstance<TEntity>;
  merge(from: StoreInstance<TEntity>): void;
  lock(): void;
  unlock(): void;
  on<TEvent extends keyof StoreInstanceEvents>(event: TEvent, cb: StoreInstanceEvents[keyof StoreInstanceEvents]): void;
  off<TEvent extends keyof StoreInstanceEvents>(
    event: TEvent,
    cb: StoreInstanceEvents[keyof StoreInstanceEvents]
  ): void;
}

export type PublicStoreInstanceAPI<TEntity = unknown> = Omit<
  StoreInstance<TEntity>,
  'on' | 'off' | 'clone' | 'merge' | 'lock' | 'unlock'
>;

export type ReadonlyStoreAPI<TEntity = unknown> = Omit<
  PublicStoreInstanceAPI<TEntity>,
  'create' | 'update' | 'updateAllWhere' | 'replace' | 'delete' | 'deleteAllWhere'
>;

export interface StoreInstanceEvents {
  stateChanged(): void;
}

export type SchemaParser<TEntity> = (obj: unknown) => TEntity;

export type StoreEntityType<TStore extends Store> = TStore extends Store<infer TEntity> ? TEntity : never;

export type StoreInstanceOf<TStore extends Store> = StoreInstance<StoreEntityType<TStore>>;

export type PublicStoreInstanceOf<TStore extends Store> = PublicStoreInstanceAPI<StoreEntityType<TStore>>;

export type ReadonlyStoreInstanceOf<TStore extends Store> = ReadonlyStoreAPI<StoreEntityType<TStore>>;
