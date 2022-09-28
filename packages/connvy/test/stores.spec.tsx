import React from 'react';
import Chance from 'chance';
import { act, fireEvent, render } from '@testing-library/react';
import {
  ConnvyProvider,
  createStore,
  EntityType,
  useStore,
  PublicStoreAPI,
} from '../src';

describe('Connvy Stores', () => {
  const todosStore = createStore({
    name: 'todos',
    schema: ($) => ({ title: $.string(), checked: $.boolean() }),
  });

  describe('CRUD operations', () => {
    type Todo = EntityType<typeof todosStore>;

    const givenTodosStoreWithData = (data: Todo[]) => {
      const store = todosStore.create();
      data.forEach((item) => store.create(item));
      return store;
    };

    describe('Creating items in the store', () => {
      it('should allow adding and getting the items you created', () => {
        const store = todosStore.create();

        const todo1: Todo = {
          title: Chance().sentence(),
          checked: Chance().bool(),
        };
        const todo2: Todo = {
          title: Chance().sentence(),
          checked: Chance().bool(),
        };
        const todo3: Todo = {
          title: Chance().sentence(),
          checked: Chance().bool(),
        };

        store.create(todo1);
        store.create(todo2);
        store.create(todo3);

        expect(store.get(0)).toEqual(todo1);
        expect(store.get(1)).toEqual(todo2);
        expect(store.get(2)).toEqual(todo3);
      });

      it('should reject creating items that do not match the schema, and not push them into the collection', () => {
        const store = todosStore.create();

        const notTodo: Omit<Todo, 'checked'> = {
          title: Chance().sentence(),
        };

        // @ts-expect-error: store expects us to pass a valid todo, and our notTodo isn't one. This is ok because this is exactly what we're testing here
        expect(() => store.create(notTodo)).toThrow('invalid_type');
        expect(store.list()).toHaveLength(0);
      });
    });

    describe('Getting items from the store', () => {
      it('should allow getting items by index', () => {
        const todo: Todo = {
          title: Chance().sentence(),
          checked: Chance().bool(),
        };

        const store = givenTodosStoreWithData([todo]);

        expect(store.get(0)).toEqual(todo);
      });

      it('should allow getting items by search criteria', () => {
        const todo1: Todo = {
          title: Chance().sentence(),
          checked: false,
        };

        const todo2: Todo = {
          title: Chance().sentence(),
          checked: true,
        };

        const todo3: Todo = {
          title: Chance().sentence(),
          checked: false,
        };

        const store = givenTodosStoreWithData([todo1, todo2, todo3]);

        expect(store.getBy((todo) => todo.checked)).toEqual(todo2);
      });

      it('should return the first matching item if several match the search criteria', () => {
        const todo1: Todo = {
          title: Chance().sentence(),
          checked: false,
        };

        const todo2: Todo = {
          title: Chance().sentence(),
          checked: true,
        };

        const todo3: Todo = {
          title: Chance().sentence(),
          checked: true,
        };

        const store = givenTodosStoreWithData([todo1, todo2, todo3]);

        expect(store.getBy((todo) => todo.checked)).toEqual(todo2);
      });

      it('should throw if item does not exist at index', () => {
        const todo: Todo = {
          title: Chance().sentence(),
          checked: Chance().bool(),
        };

        const store = givenTodosStoreWithData([todo]);

        expect(() => store.get(1)).toThrow(
          'No item was found at index 1 (collection has 1 items, and the index we use in "get" is zero-based)'
        );
      });

      it('should throw if no item matches the search criteria', () => {
        const todo1: Todo = {
          title: Chance().sentence(),
          checked: false,
        };

        const todo2: Todo = {
          title: Chance().sentence(),
          checked: false,
        };

        const todo3: Todo = {
          title: Chance().sentence(),
          checked: false,
        };

        const store = givenTodosStoreWithData([todo1, todo2, todo3]);

        expect(() => store.getBy((todo) => todo.checked)).toThrow(
          'No item in the collection matches the search criteria'
        );
      });

      it('should return a fallback item instead of throwing, if fallback was provided', () => {
        const todo: Todo = {
          title: Chance().sentence(),
          checked: false,
        };

        const fallbackTodo: Todo = {
          title: Chance().sentence(),
          checked: true,
        };

        const store = givenTodosStoreWithData([todo]);

        expect(store.get(1, { fallback: fallbackTodo })).toEqual(fallbackTodo);

        expect(
          store.getBy((todo) => todo.checked, { fallback: fallbackTodo })
        ).toEqual(fallbackTodo);
      });
    });

    describe('Listing items from the store', () => {
      it('should allow listing all items in the store', () => {
        const todo1: Todo = {
          title: Chance().sentence(),
          checked: false,
        };

        const todo2: Todo = {
          title: Chance().sentence(),
          checked: true,
        };

        const todo3: Todo = {
          title: Chance().sentence(),
          checked: false,
        };

        const store = givenTodosStoreWithData([todo1, todo2, todo3]);
        expect(store.list()).toEqual([todo1, todo2, todo3]);
      });

      it('should allow listing only items that match a given filter', () => {
        const todo1: Todo = {
          title: Chance().sentence(),
          checked: false,
        };

        const todo2: Todo = {
          title: Chance().sentence(),
          checked: true,
        };

        const todo3: Todo = {
          title: Chance().sentence(),
          checked: true,
        };

        const store = givenTodosStoreWithData([todo1, todo2, todo3]);
        expect(store.listBy((todo) => todo.checked)).toEqual([todo2, todo3]);
      });

      it('should return an empty list for a freshly created store', () => {
        const store = todosStore.create();

        expect(store.list()).toEqual([]);
        expect(store.listBy(() => true)).toEqual([]);
      });
    });

    describe('Updating items in the store', () => {
      describe('Updating by index', () => {
        it('should allow updating an item in the store', () => {
          const todo: Todo = {
            title: Chance().sentence(),
            checked: Chance().bool(),
          };

          const updatedTodo: Todo = {
            title: Chance().sentence(),
            checked: Chance().bool(),
          };

          const store = givenTodosStoreWithData([todo]);
          store.update(0, updatedTodo);

          expect(store.get(0)).toEqual(updatedTodo);
          expect(store.list()).toHaveLength(1);
        });

        it('should allow updating part of an item in the store', () => {
          const todo: Todo = {
            title: Chance().sentence(),
            checked: Chance().bool(),
          };

          const newTitle = Chance().sentence();

          const store = givenTodosStoreWithData([todo]);
          store.update(0, { title: newTitle });

          expect(store.get(0)).toEqual({
            title: newTitle,
            checked: todo.checked,
          });
        });

        it('should throw if updates do not match the schema, and not alter the target item', () => {
          const todo: Todo = {
            title: Chance().sentence(),
            checked: Chance().bool(),
          };

          const notAValidTitle = 123456;

          const store = givenTodosStoreWithData([todo]);

          // @ts-expect-error: store expects our new title to be a string, but it isn't. this is ok since this is what we're trying to test here!
          expect(() => store.update(0, { title: notAValidTitle })).toThrow(
            'invalid_type'
          );
          expect(store.get(0)).toEqual(todo);
        });

        it('should throw if trying to update an item that does not exist', () => {
          const todo: Todo = {
            title: Chance().sentence(),
            checked: Chance().bool(),
          };

          const store = givenTodosStoreWithData([todo]);

          expect(() => store.update(1, { title: 'some title' })).toThrow(
            'Could not update item at index 1 (collection has 1 items, and the index we use in "update" is zero-based)'
          );
        });
      });

      describe('Updating by matcher', () => {
        it('should allow updating an item in the store', () => {
          const todo: Todo = {
            title: Chance().sentence(),
            checked: false,
          };

          const store = givenTodosStoreWithData([todo]);
          store.updateAllWhere((todo) => !todo.checked, { checked: true });

          expect(store.get(0)).toEqual({ title: todo.title, checked: true });
          expect(store.list()).toHaveLength(1);
        });

        it('should updating all items that were matched', () => {
          const todo1: Todo = {
            title: Chance().sentence(),
            checked: false,
          };
          const todo2: Todo = {
            title: Chance().sentence(),
            checked: false,
          };

          const store = givenTodosStoreWithData([todo1, todo2]);
          store.updateAllWhere((todo) => !todo.checked, { checked: true });

          expect(store.get(0)).toEqual({ title: todo1.title, checked: true });
          expect(store.get(1)).toEqual({ title: todo2.title, checked: true });
        });

        it('should not update items that were not matched', () => {
          const todo1: Todo = {
            title: Chance().sentence(),
            checked: false,
          };
          const todo2: Todo = {
            title: Chance().sentence(),
            checked: true,
          };

          const store = givenTodosStoreWithData([todo1, todo2]);
          store.updateAllWhere((todo) => !todo.checked, {
            title: 'I am not checked',
          });

          expect(store.get(0)).toEqual({
            title: 'I am not checked',
            checked: false,
          });
          expect(store.get(1)).toEqual(todo2);
        });

        it('should return the amount of affected rows', () => {
          const todo1: Todo = {
            title: Chance().sentence(),
            checked: false,
          };
          const todo2: Todo = {
            title: Chance().sentence(),
            checked: true,
          };
          const todo3: Todo = {
            title: Chance().sentence(),
            checked: false,
          };

          const store = givenTodosStoreWithData([todo1, todo2, todo3]);

          const affectedRows = store.updateAllWhere((todo) => !todo.checked, {
            checked: true,
          });
          expect(affectedRows).toEqual(2);
        });

        it('should throw if updates do not match the schema, and not alter the target item', () => {
          const todo1: Todo = {
            title: Chance().sentence(),
            checked: false,
          };
          const todo2: Todo = {
            title: Chance().sentence(),
            checked: false,
          };

          const notAValidTitle = 123456;

          const store = givenTodosStoreWithData([todo1, todo2]);

          expect(() =>
            store.updateAllWhere((todo) => !todo.checked, {
              // @ts-expect-error: store expects our new title to be a string, but it isn't. this is ok since this is what we're trying to test here!
              title: notAValidTitle,
            })
          ).toThrow('invalid_type');
          expect(store.get(0)).toEqual(todo1);
          expect(store.get(1)).toEqual(todo2);
        });
      });
    });

    describe('Deleting items from the store', () => {
      it('should allow deleting items by index', () => {
        const todo1: Todo = {
          title: Chance().sentence(),
          checked: Chance().bool(),
        };
        const todo2: Todo = {
          title: Chance().sentence(),
          checked: Chance().bool(),
        };
        const todo3: Todo = {
          title: Chance().sentence(),
          checked: Chance().bool(),
        };

        const store = givenTodosStoreWithData([todo1, todo2, todo3]);
        store.delete(1);

        expect(store.list()).toEqual([todo1, todo3]);
      });

      it('should allow deleting items by matcher', () => {
        const todo1: Todo = {
          title: Chance().sentence(),
          checked: true,
        };
        const todo2: Todo = {
          title: Chance().sentence(),
          checked: false,
        };
        const todo3: Todo = {
          title: Chance().sentence(),
          checked: true,
        };

        const store = givenTodosStoreWithData([todo1, todo2, todo3]);
        store.deleteAllWhere((todo) => todo.checked);

        expect(store.list()).toEqual([todo2]);
      });

      it('should return how many items were deleted, when using "deleteAllWhere"', () => {
        const todo1: Todo = {
          title: Chance().sentence(),
          checked: true,
        };
        const todo2: Todo = {
          title: Chance().sentence(),
          checked: false,
        };
        const todo3: Todo = {
          title: Chance().sentence(),
          checked: true,
        };

        const store = givenTodosStoreWithData([todo1, todo2, todo3]);
        const itemsDeleted = store.deleteAllWhere((todo) => todo.checked);

        expect(itemsDeleted).toEqual(2);
      });

      it('should throw if trying to delete an item that does not exist, when using "delete" (by index)', () => {
        const todo: Todo = {
          title: Chance().sentence(),
          checked: Chance().bool(),
        };

        const store = givenTodosStoreWithData([todo]);

        expect(() => store.delete(1)).toThrow(
          'Could not delete item at index 1 (collection has 1 items, and the index we use in "delete" is zero-based)'
        );
      });
    });
  });

  describe('Using stores in React applications', () => {
    describe('Basic usage', () => {
      it('should allow using stores from react applications via the "useStore" hook', () => {
        const TodosApp = () => {
          const todos = useStore(todosStore);

          const addTodos = () => {
            todos.create({ title: 'My First Todo', checked: true });
            todos.create({ title: 'My Second Todo', checked: false });
            todos.create({ title: 'My Third Todo', checked: false });
          };

          return (
            <div>
              <ul>
                {todos.list().map((todo, i) => (
                  <li key={i} data-testid="todo-item">
                    {todo.title} (checked: {todo.checked ? 'true' : 'false'})
                  </li>
                ))}
              </ul>
              <button onClick={addTodos}>Add Some Todos</button>
            </div>
          );
        };

        const component = render(
          <ConnvyProvider>
            <TodosApp />
          </ConnvyProvider>
        );

        act(() => {
          fireEvent.click(component.getByText('Add Some Todos'));
        });

        expect(component.baseElement.textContent).toContain(
          'My First Todo (checked: true)'
        );
        expect(component.baseElement.textContent).toContain(
          'My Second Todo (checked: false)'
        );
        expect(component.baseElement.textContent).toContain(
          'My Third Todo (checked: false)'
        );
      });

      it('should throw during rendering if the app was not wrapped with a <ConnvyProvider /> component', () => {
        const TodosApp = () => {
          const todos = useStore(todosStore);

          return <div>You have {todos.list().length} todos</div>;
        };

        expect(() => render(<TodosApp />)).toThrow(
          'Connvy was not initialized in context. Please wrap your app with the <ConnvyProvider /> component'
        );
      });
    });

    describe('When should component re-render', () => {
      type UseTodoStoreHook = PublicStoreAPI<
        ReturnType<typeof todosStore['schema']>
      >;

      const renderReactApp = () => {
        let timesRendered = 0;
        let todos: UseTodoStoreHook;

        const TodosApp = () => {
          todos = useStore(todosStore);
          timesRendered += 1;
          return <div>You rendered {timesRendered} times</div>;
        };

        render(
          <ConnvyProvider>
            <TodosApp />
          </ConnvyProvider>
        );

        // @ts-expect-error: that's ok, we expect todos to have been populated by the component
        return [todos, () => timesRendered - 1] as const;
      };

      it('should rerender when using "create"', () => {
        const [todos, timesReRendered] = renderReactApp();

        act(() => {
          todos.create({
            title: Chance().sentence(),
            checked: Chance().bool(),
          });
        });

        expect(timesReRendered()).toBe(1);
      });

      it('should rerender when using "update"', () => {
        const [todos, timesReRendered] = renderReactApp();

        act(() => {
          todos.create({
            title: Chance().sentence(),
            checked: Chance().bool(),
          });
        });

        act(() => {
          todos.update(0, {
            title: Chance().sentence(),
            checked: Chance().bool(),
          });
        });

        expect(timesReRendered()).toBe(2);
      });

      it('should rerender when using "updateAllWhere"', () => {
        const [todos, timesReRendered] = renderReactApp();

        act(() => {
          todos.create({
            title: Chance().sentence(),
            checked: false,
          });
        });

        act(() => {
          todos.updateAllWhere((todo) => !todo.checked, {
            title: Chance().sentence(),
            checked: Chance().bool(),
          });
        });

        expect(timesReRendered()).toBe(2);
      });

      it('should not rerender when using "updateAllWhere", if nothing was changed', () => {
        const [todos, timesReRendered] = renderReactApp();

        act(() => {
          todos.create({
            title: Chance().sentence(),
            checked: false,
          });
        });

        act(() => {
          todos.updateAllWhere(() => false, {
            title: Chance().sentence(),
            checked: Chance().bool(),
          });
        });

        expect(timesReRendered()).toBe(1);
      });

      it('should rerender when using "delete"', () => {
        const [todos, timesReRendered] = renderReactApp();

        act(() => {
          todos.create({
            title: Chance().sentence(),
            checked: Chance().bool(),
          });
        });

        act(() => {
          todos.delete(0);
        });

        expect(timesReRendered()).toBe(2);
      });

      it('should rerender when using "deleteAllWhere"', () => {
        const [todos, timesReRendered] = renderReactApp();

        act(() => {
          todos.create({
            title: Chance().sentence(),
            checked: false,
          });
        });

        act(() => {
          todos.deleteAllWhere((todo) => !todo.checked);
        });

        expect(timesReRendered()).toBe(2);
      });

      it('should not rerender when using "deleteAllWhere", if nothing was changed', () => {
        const [todos, timesReRendered] = renderReactApp();

        act(() => {
          todos.create({
            title: Chance().sentence(),
            checked: false,
          });
        });

        act(() => {
          todos.deleteAllWhere(() => false);
        });

        expect(timesReRendered()).toBe(1);
      });

      it('should not rerender when using "get"', () => {
        const [todos, timesReRendered] = renderReactApp();

        act(() => {
          todos.create({
            title: Chance().sentence(),
            checked: Chance().bool(),
          });
        });

        act(() => {
          todos.get(0);
        });

        expect(timesReRendered()).toBe(1);
      });

      it('should not rerender when using "getBy"', () => {
        const [todos, timesReRendered] = renderReactApp();

        act(() => {
          todos.create({
            title: Chance().sentence(),
            checked: true,
          });
        });

        act(() => {
          todos.getBy((todo) => todo.checked);
        });

        expect(timesReRendered()).toBe(1);
      });

      it('should not rerender when using "list"', () => {
        const [todos, timesReRendered] = renderReactApp();

        act(() => {
          todos.list();
        });

        expect(timesReRendered()).toBe(0);
      });

      it('should not rerender when using "listBy"', () => {
        const [todos, timesReRendered] = renderReactApp();

        act(() => {
          todos.create({
            title: Chance().sentence(),
            checked: true,
          });
        });

        act(() => {
          todos.listBy((todo) => todo.checked);
        });

        expect(timesReRendered()).toBe(1);
      });
    });

    describe('Minimal re-rendering', () => {
      type UseTodoStoreHook = PublicStoreAPI<
        ReturnType<typeof todosStore['schema']>
      >;

      type UseBaglesStoreHook = PublicStoreAPI<
        ReturnType<typeof baglesStore['schema']>
      >;

      const baglesStore = createStore({
        name: 'bagles',
        schema: ($) => ({ fresh: $.boolean() }),
      });

      const renderReactApp = () => {
        let componentWithTodoStoreRenders = 0;
        let todos: UseTodoStoreHook;
        const ComponentWithTodosStore = () => {
          todos = useStore(todosStore);
          componentWithTodoStoreRenders += 1;
          return <div>You rendered {componentWithTodoStoreRenders} times</div>;
        };

        let componentWithBaglesStoreRenders = 0;
        let bagles: UseBaglesStoreHook;
        const ComponentWithBaglesStore = () => {
          bagles = useStore(baglesStore);
          componentWithBaglesStoreRenders += 1;
          return <div>You rendered {componentWithTodoStoreRenders} times</div>;
        };

        let componentWithoutStoresRenders = 0;
        const ComponentWithoutStores = () => {
          componentWithoutStoresRenders += 1;
          return <div>You rendered {componentWithTodoStoreRenders} times</div>;
        };

        render(
          <ConnvyProvider>
            <ComponentWithTodosStore />
            <ComponentWithBaglesStore />
            <ComponentWithoutStores />
          </ConnvyProvider>
        );

        return {
          ComponentWithTodosStore: {
            rerenders: () => componentWithTodoStoreRenders - 1,
          },
          ComponentWithBaglesStore: {
            rerenders: () => componentWithBaglesStoreRenders - 1,
          },
          ComponentWithoutStores: {
            rerenders: () => componentWithoutStoresRenders - 1,
          },
          // @ts-expect-error: that's ok, we expect todos to have been populated by the component
          todos,
          // @ts-expect-error: that's ok, we expect bagles to have been populated by the component
          bagles,
        };
      };

      it('should cause components to re-render if they are using useStore directly with the affected store', () => {
        const { ComponentWithTodosStore, todos } = renderReactApp();

        act(() => {
          todos.create({
            title: Chance().sentence(),
            checked: Chance().bool(),
          });
        });

        expect(ComponentWithTodosStore.rerenders()).toBe(1);
      });

      it('should not cause components to re-render if they are using useStore, but with another store', () => {
        const { ComponentWithBaglesStore, todos } = renderReactApp();

        act(() => {
          todos.create({
            title: Chance().sentence(),
            checked: Chance().bool(),
          });
        });

        expect(ComponentWithBaglesStore.rerenders()).toBe(0);
      });

      it('should cause components to re-render if they are not using useStore at all', () => {
        const { ComponentWithoutStores, todos, bagles } = renderReactApp();

        act(() => {
          todos.create({
            title: Chance().sentence(),
            checked: Chance().bool(),
          });
        });

        act(() => {
          bagles.create({ fresh: true });
        });

        expect(ComponentWithoutStores.rerenders()).toBe(0);
      });
    });
  });
});
