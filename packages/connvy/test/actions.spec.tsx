import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { ConnvyProvider, createAction, createStore, useStore } from '../src';
import { useActions } from '../src/actions/useActions';

describe('Connvy Actions', () => {
  const todosStore = createStore('todos', {
    schema: ($) => ({
      title: $.string(),
      owner: $.string(),
      checked: $.boolean(),
    }),
  });

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  describe('Basic usage', () => {
    it('should allow using actions from react applications via the "useActions" hook', () => {
      const createTodoForMe = createAction('createTodo', { todosStore }, ({ todosStore }, title: string) => {
        todosStore.create({ title, owner: 'me', checked: false });
      });

      const TodosApp = () => {
        const todos = useStore(todosStore);
        const actions = useActions();

        const addTodos = () => {
          actions.run(createTodoForMe('My First Todo'));
          actions.run(createTodoForMe('My Second Todo'));
          actions.run(createTodoForMe('My Third Todo'));
        };

        return (
          <div>
            <ul>
              {todos.list().map((todo, i) => (
                <li key={i} data-testid="todo-item">
                  {todo.title}
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

      expect(component.baseElement.textContent).toContain('My First Todo');
      expect(component.baseElement.textContent).toContain('My Second Todo');
      expect(component.baseElement.textContent).toContain('My Third Todo');
    });

    it('should throw during rendering if the app was not wrapped with a <ConnvyProvider /> component', () => {
      const Component = () => {
        const actions = useActions();

        return <div>Sadly, I should never render...</div>;
      };

      const renderApp = () => render(<Component />);

      expect(renderApp).toThrow(
        'Connvy was not initialized in context. Please wrap your app with the <ConnvyProvider /> component'
      );
    });
  });

  describe('Async Actions', () => {
    it('should return a promise that resolves after the action is completed', async () => {
      const createTodoForMe = createAction('createTodo', { todosStore }, async ({ todosStore }, title: string) => {
        todosStore.create({ title, owner: 'me', checked: false });
      });

      const Component = () => {
        const todos = useStore(todosStore);
        const actions = useActions();

        const runRoutine = async () => {
          await actions.run(createTodoForMe('Created During Action'));
          todos.create({ title: 'Created After Action', owner: 'me', checked: true });
        };

        return (
          <div>
            {todos
              .list()
              .map((todo) => todo.title)
              .join()}
            <button onClick={runRoutine}>Run Routine</button>
          </div>
        );
      };

      const component = render(
        <ConnvyProvider>
          <Component />
        </ConnvyProvider>
      );

      act(() => {
        fireEvent.click(component.getByText('Run Routine'));
      });

      await sleep(500);

      expect(component.baseElement.textContent).toContain(['Created During Action', 'Created After Action'].join());
    });
  });

  describe('Error Handling', () => {
    it.todo('should rethrow errors thrown in a sync action');

    it.todo('should reject async actions if errors were thrown in them');
  });

  describe('Actions Linearity', () => {
    it.todo('should not let you run an action while another one is already ongoing');
  });

  describe('Action State', () => {
    it.todo('should return the IDLE state if no action was run yet');

    it.todo('should return the ONGOING state if an action is currently running');

    it.todo('should return the COMPLETED state of the last action that was run');

    it.todo('should return the ERROR state of the last action that was run, if it failed');

    describe('While focusing on a specific action (using "useActionState(specificAction)")', () => {
      it.todo("should return the IDLE state if it's not the last action that was run");

      it.todo("should return the ONGOING state ONLY if it's specifically the currently running action");

      it.todo(
        'should return the COMPLETED state if it was the last action that was run, and it was completed successfully'
      );

      it.todo('should return the ERROR state if it was the last action that was run, and it failed');
    });

    describe('While focusing on a set of actions (using "useActionState([specificAction1, specificAction2])")', () => {
      it.todo('should return the IDLE state if non of the actions is the last one to run');

      it.todo(
        'should return the ONGOING for any of the specified actions, if one of them is the currently running action'
      );

      it.todo(
        'should return the COMPLETED state for any of the specified actions, if one of them was the last to run, and has completed successfully'
      );

      it.todo(
        'should return the ERROR state for any of the specified actions, if one of them was the last to run, and it failed'
      );
    });
  });

  describe('Canceling Actions', () => {
    it.todo('should let you cancel an ongoing action using the "cancel" modifier');

    it.todo('should let you chain and run another action after cancelling the current one');

    describe('Cancelling a specific action (using "actions.cancel(specificAction)")', () => {
      it.todo("should cancel it if it's running");

      it.todo('should not cancel any other action');
    });

    describe('Cancelling a given set of actions (using "actions.cancel([specificAction1, specificAction2])")', () => {
      it.todo("should cancel any of the given actions it if it's running");

      it.todo('should not cancel any other action that is not in the set');
    });
  });

  describe('Store State Isolation', () => {
    it.todo("should not reflect any changes made to the store outside of the action, while it's still ongoing");

    it.todo('should not let anyone outside of the action to write to the affected stores');

    it.todo('should let other routines to write to unaffected stores (ones not required by the action)');

    describe('When action has failed', () => {
      it.todo('should not commit any of the changes it made to the stores');
    });

    describe('When action was cancelled', () => {
      it.todo('should not commit any of the changes it made to the stores');
    });
  });
});