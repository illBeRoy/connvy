import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import {
  ConnvyProvider,
  createSelector,
  createStore,
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
              {myTodos.map((todo, i) => (
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

  describe('Returning errors', () => {
    it.todo(
      'should return the thrown error as a second item in the tuple, if an error was thrown during the selection'
    );
    it.todo('should return a null if no error was thrown during the selection');
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
