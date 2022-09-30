import { StoreIsReadOnlyError } from '../errors';
import { StoreInstanceImpl } from './storeInstance';
import type { StoreInstance } from './types';

export class ReadOnlyStoreInstanceImpl<TEntity> extends StoreInstanceImpl<TEntity> implements StoreInstance<TEntity> {
  create(): TEntity {
    throw new StoreIsReadOnlyError({ storeName: this.storeName, method: 'create' });
  }

  update(): TEntity {
    throw new StoreIsReadOnlyError({ storeName: this.storeName, method: 'update' });
  }

  updateAllWhere(): number {
    throw new StoreIsReadOnlyError({
      storeName: this.storeName,
      method: 'updateAllWhere',
    });
  }

  delete(): void {
    throw new StoreIsReadOnlyError({ storeName: this.storeName, method: 'delete' });
  }

  deleteAllWhere(): number {
    throw new StoreIsReadOnlyError({
      storeName: this.storeName,
      method: 'deleteAllWhere',
    });
  }
}
