import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import {
  ConnvyProvider,
  createSelector,
  createStore,
  Selector,
  useSelector,
  useStore,
} from '../src';

describe('Connvy Selectors', () => {
  const todosStore = createStore({
    name: 'todos',
    schema: ($) => ({
      title: $.string(),
      owner: $.string(),
      checked: $.boolean(),
    }),
  });

  describe('Basic usage', () => {
    it('should allow using selectors from react applications via the "useSelector" hook', () => {
      const selectTodosByOwner = createSelector(
        { todosStore },
        ({ todosStore }, owner: string) => {
          return todosStore.listBy((todo) => todo.owner === owner);
        }
      );

      const TodosApp = () => {
        const todos = useStore(todosStore);
        const [myTodos] = useSelector(selectTodosByOwner('me'));

        const addTodos = () => {
          todos.create({
            title: 'My First Todo',
            owner: 'me',
            checked: true,
          });
          todos.create({
            title: "Roy's First Todo",
            owner: 'roy',
            checked: false,
          });
          todos.create({
            title: 'My Second Todo',
            owner: 'me',
            checked: false,
          });
        };

        return (
          <div>
            <ul>
              {myTodos?.map((todo, i) => (
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
      expect(component.baseElement.textContent).not.toContain(
        "Roy's First Todo"
      );
    });
  });

  describe('Handling errors', () => {
    const aComponentWithSelector = (selector: Selector<any>) => {
      const Component = () => {
        const [results, error] = useSelector(selector);

        return (
          <div>
            Results: {`${results}`} <br />
            Error: {`${error}`}
          </div>
        );
      };

      const results = (val: unknown) => `Results: ${`${val}`}`;
      const error = (error: unknown) => `Error: ${`${error}`}`;

      return { Component, results, error };
    };

    describe('Handling errors that occurred in the selector', () => {
      it('should return the thrown error as a second item in the tuple, if an error was thrown during the selection', () => {
        const selectorThatThrows = createSelector(
          { todosStore },
          ({ todosStore }) => {
            throw new Error('Oh no I threw!');
          }
        );

        const { Component, results, error } = aComponentWithSelector(
          selectorThatThrows()
        );

        const component = render(
          <ConnvyProvider>
            <Component />
          </ConnvyProvider>
        );

        expect(component.baseElement.textContent).toContain(results(null));
        expect(component.baseElement.textContent).toContain(
          error('Oh no I threw!')
        );
      });

      it('should return a null if no error was thrown during the selection', () => {
        const selectorThatDoesNotThrow = createSelector(
          { todosStore },
          ({ todosStore }) => {
            return 'I did not throw! Yay!';
          }
        );

        const { Component, results, error } = aComponentWithSelector(
          selectorThatDoesNotThrow()
        );

        const component = render(
          <ConnvyProvider>
            <Component />
          </ConnvyProvider>
        );

        expect(component.baseElement.textContent).toContain(
          results('I did not throw! Yay!')
        );
        expect(component.baseElement.textContent).toContain(error(null));
      });
    });

    describe('Handling errors due to misuse', () => {
      it('should throw during rendering if the app was not wrapped with a <ConnvyProvider /> component', () => {
        const selectorThatDoesNotThrow = createSelector(
          { todosStore },
          ({ todosStore }) => {
            return todosStore.list();
          }
        );

        const { Component } = aComponentWithSelector(
          selectorThatDoesNotThrow()
        );

        const renderApp = () => render(<Component />);

        expect(renderApp).toThrow(
          'Connvy was not initialized in context. Please wrap your app with the <ConnvyProvider /> component'
        );
      });

      it('should throw if the selector returned a promise', () => {
        const asyncSelector = createSelector(
          { todosStore },
          async ({ todosStore }) => {
            return 'I did not throw! Yay!';
          }
        );

        const { Component } = aComponentWithSelector(asyncSelector());

        const renderApp = () =>
          render(
            <ConnvyProvider>
              <Component />
            </ConnvyProvider>
          );

        expect(renderApp).toThrow(
          'Selectors cannot use async functions or return promises'
        );
      });

      it('should throw if attempting to use "create" from a selector', () => {
        const selectorThatTriesToCreate = createSelector(
          { todosStore },
          ({ todosStore }) => {
            //@ts-expect-error: types won't let you use "create" in a selector, but we're testing an illegal use-case
            todosStore.create({});
          }
        );

        const { Component, error } = aComponentWithSelector(
          selectorThatTriesToCreate()
        );

        const component = render(
          <ConnvyProvider>
            <Component />
          </ConnvyProvider>
        );

        expect(component.baseElement.textContent).toContain(
          error(
            'Stores are read-only in selectors (tried to use the "create" method)'
          )
        );
      });

      it('should throw if attempting to use "update" from a selector', () => {
        const selectorThatTriesToUpdate = createSelector(
          { todosStore },
          ({ todosStore }) => {
            //@ts-expect-error: types won't let you use "update" in a selector, but we're testing an illegal use-case
            todosStore.update(0, {});
          }
        );

        const { Component, error } = aComponentWithSelector(
          selectorThatTriesToUpdate()
        );

        const component = render(
          <ConnvyProvider>
            <Component />
          </ConnvyProvider>
        );

        expect(component.baseElement.textContent).toContain(
          error(
            'Stores are read-only in selectors (tried to use the "update" method)'
          )
        );
      });

      it('should throw if attempting to use "updateAllWhere" from a selector', () => {
        const selectorThatTriesToUpdateAllWhere = createSelector(
          { todosStore },
          ({ todosStore }) => {
            //@ts-expect-error: types won't let you use "updateAllWhere" in a selector, but we're testing an illegal use-case
            todosStore.updateAllWhere((todo) => todo.checked, {});
          }
        );

        const { Component, error } = aComponentWithSelector(
          selectorThatTriesToUpdateAllWhere()
        );

        const component = render(
          <ConnvyProvider>
            <Component />
          </ConnvyProvider>
        );

        expect(component.baseElement.textContent).toContain(
          error(
            'Stores are read-only in selectors (tried to use the "updateAllWhere" method)'
          )
        );
      });

      it('should throw if attempting to use "delete" from a selector', () => {
        const selectorThatTriesToDelete = createSelector(
          { todosStore },
          ({ todosStore }) => {
            //@ts-expect-error: types won't let you use "delete" in a selector, but we're testing an illegal use-case
            todosStore.delete(0);
          }
        );

        const { Component, error } = aComponentWithSelector(
          selectorThatTriesToDelete()
        );

        const component = render(
          <ConnvyProvider>
            <Component />
          </ConnvyProvider>
        );

        expect(component.baseElement.textContent).toContain(
          error(
            'Stores are read-only in selectors (tried to use the "delete" method)'
          )
        );
      });

      it('should throw if attempting to use "deleteAllWhere" from a selector', () => {
        const selectorThatTriesToDeleteAllWhere = createSelector(
          { todosStore },
          ({ todosStore }) => {
            //@ts-expect-error: types won't let you use "deleteAllWhere" in a selector, but we're testing an illegal use-case
            todosStore.deleteAllWhere((todo) => todo.checked);
          }
        );

        const { Component, error } = aComponentWithSelector(
          selectorThatTriesToDeleteAllWhere()
        );

        const component = render(
          <ConnvyProvider>
            <Component />
          </ConnvyProvider>
        );

        expect(component.baseElement.textContent).toContain(
          error(
            'Stores are read-only in selectors (tried to use the "deleteAllWhere" method)'
          )
        );
      });
    });
  });

  describe('Fallbacks', () => {
    it.todo('should return the fallback value upon error, if one was given');

    it.todo(
      'should not return the fallback value, if the selection did not throw'
    );
  });

  describe('Memoization', () => {
    it.todo(
      'should rerun the selection if one of the dependant store has changed'
    );

    it.todo('should rerun the selection if one of the parameters has changed');

    it.todo(
      'should not rerun the selection if nothing has changed in either the dependant stores nor the parameters'
    );
  });
});
