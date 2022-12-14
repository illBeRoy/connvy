/* eslint-disable @typescript-eslint/no-empty-function */
import React, { useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { afterThis } from 'jest-after-this';
import { ConnvyProvider, createAction, createStore, useActions, useActionState, useStore } from '../src';

describe('Connvy Actions', () => {
  const todosStore = createStore('todos', {
    schema: ($) => ({
      title: $.string(),
      owner: $.string(),
      checked: $.boolean(),
    }),
  });

  const waitForAsync = (time = 500) => new Promise((res) => setTimeout(res, time));

  describe('Basic usage', () => {
    it('should allow using actions from react applications via the "useActions" hook', () => {
      const createTodoForMe = createAction('createTodoForMe', { todosStore }, ({ todosStore }, title: string) => {
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
      const createTodoForMe = createAction('createTodoForMe', { todosStore }, async ({ todosStore }, title: string) => {
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

      await act(async () => {
        fireEvent.click(component.getByText('Run Routine'));
        await waitForAsync();
      });

      expect(component.baseElement.textContent).toContain(['Created During Action', 'Created After Action'].join());
    });
  });

  describe('Error Handling', () => {
    it('should rethrow errors thrown in a sync action', () => {
      const iThrow = createAction('iThrow', {}, () => {
        throw new Error('Oh no I threw!');
      });

      const Component = () => {
        const actions = useActions();
        const [error, setError] = useState('');

        const runRoutine = () => {
          try {
            actions.run(iThrow());
          } catch (err) {
            setError(`${err}`);
          }
        };

        return (
          <div>
            Error: {error}
            <br />
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

      expect(component.baseElement.textContent).toContain('Error: Oh no I threw!');
    });

    it('should reject async actions if errors were thrown in them', async () => {
      const iReject = createAction('iReject', {}, async () => {
        throw new Error('Oh no I threw!');
      });

      const Component = () => {
        const actions = useActions();
        const [error, setError] = useState('');

        const runRoutine = () => {
          actions.run(iReject()).catch((err) => setError(`${err}`));
        };

        return (
          <div>
            Error: {error}
            <br />
            <button onClick={runRoutine}>Run Routine</button>
          </div>
        );
      };

      const component = render(
        <ConnvyProvider>
          <Component />
        </ConnvyProvider>
      );

      await act(async () => {
        fireEvent.click(component.getByText('Run Routine'));
        await waitForAsync();
      });

      expect(component.baseElement.textContent).toContain('Error: Oh no I threw!');
    });
  });

  describe('Actions Linearity', () => {
    it('should not let you run an action while another one is already ongoing', async () => {
      const waitSeconds = createAction('waitSeconds', {}, async ({}, seconds: number) => {
        await new Promise((res) => setTimeout(res, seconds * 1000));
      });

      const createTodoForMe = createAction('createTodoForMe', { todosStore }, ({ todosStore }, title: string) => {
        todosStore.create({ title, owner: 'me', checked: false });
      });

      const Component = () => {
        const actions = useActions();
        const [error, setError] = useState('');

        const runRoutine = () => {
          actions.run(waitSeconds(1));

          try {
            actions.run(createTodoForMe('This should not be created'));
          } catch (err) {
            setError(`${err}`);
          }
        };

        return (
          <div>
            Error: {error}
            <br />
            <button onClick={runRoutine}>Run Routine</button>
          </div>
        );
      };

      const component = render(
        <ConnvyProvider>
          <Component />
        </ConnvyProvider>
      );

      await act(async () => {
        fireEvent.click(component.getByText('Run Routine'));
        await waitForAsync(1100);
      });

      expect(component.baseElement.textContent).toContain(
        '  cannot invoke action\n' +
          '    createTodoForMe("This should not be created")\n' +
          '  as there is a currently ongoing action\n' +
          '    waitSeconds(1)\n' +
          '  if you want the new action to take precedence, please cancel the ongoing one first'
      );
    });

    it('should let you run another action if the ongoing one has thrown', () => {
      const iThrow = createAction('iThrow', {}, () => {
        throw new Error('Oh no I threw!');
      });

      const createTodoForMe = createAction('createTodoForMe', { todosStore }, ({ todosStore }, title: string) => {
        todosStore.create({ title, owner: 'me', checked: false });
      });

      const Component = () => {
        const todos = useStore(todosStore);
        const actions = useActions();

        const runRoutine = () => {
          try {
            actions.run(iThrow());
          } catch (err) {
            actions.run(createTodoForMe('My Todo'));
          }
        };

        return (
          <div>
            Created Todo: {todos.list()[0]?.title}
            <br />
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

      expect(component.baseElement.textContent).toContain('Created Todo: My Todo');
    });

    it('should let you run another action if the ongoing one is async and has reject', async () => {
      const iReject = createAction('iReject', {}, async () => {
        throw new Error('Oh no I threw!');
      });

      const createTodoForMe = createAction('createTodoForMe', { todosStore }, ({ todosStore }, title: string) => {
        todosStore.create({ title, owner: 'me', checked: false });
      });

      const Component = () => {
        const todos = useStore(todosStore);
        const actions = useActions();

        const runRoutine = () => {
          actions.run(iReject()).catch(() => actions.run(createTodoForMe('My Todo')));
        };

        return (
          <div>
            Created Todo: {todos.list()[0]?.title}
            <br />
            <button onClick={runRoutine}>Run Routine</button>
          </div>
        );
      };

      const component = render(
        <ConnvyProvider>
          <Component />
        </ConnvyProvider>
      );

      await act(async () => {
        fireEvent.click(component.getByText('Run Routine'));
        await waitForAsync();
      });

      expect(component.baseElement.textContent).toContain('Created Todo: My Todo');
    });
  });

  describe('Action State', () => {
    it('should return the IDLE state if no action was run yet', () => {
      const Component = () => {
        const actionState = useActionState();
        return <div>{JSON.stringify(actionState)}</div>;
      };

      const component = render(
        <ConnvyProvider>
          <Component />
        </ConnvyProvider>
      );

      expect(component.baseElement.textContent).toContain('"state":"IDLE"');
      expect(component.baseElement.textContent).toContain('"actionName":""');
      expect(component.baseElement.textContent).toContain('"error":null');
    });

    it('should return the ONGOING state if an action is currently running', async () => {
      afterThis(() => waitForAsync(1000));

      const waitSeconds = createAction('waitSeconds', {}, async ({}, seconds: number) => {
        await new Promise((res) => setTimeout(res, seconds * 1000));
      });

      const Component = () => {
        const actions = useActions();
        const actionState = useActionState();

        const runRoutine = () => {
          actions.run(waitSeconds(1));
        };

        return (
          <div>
            {JSON.stringify(actionState)}
            <br />
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

      expect(component.baseElement.textContent).toContain('"state":"ONGOING"');
      expect(component.baseElement.textContent).toContain('"actionName":"waitSeconds"');
      expect(component.baseElement.textContent).toContain('"error":null');
    });

    it('should return the COMPLETED state of the last action that was run', () => {
      const createTodoForMe = createAction('createTodoForMe', { todosStore }, ({ todosStore }, title: string) => {
        todosStore.create({ title, owner: 'me', checked: false });
      });

      const Component = () => {
        const actions = useActions();
        const actionState = useActionState();

        const runRoutine = () => {
          actions.run(createTodoForMe('Hello, world!'));
        };

        return (
          <div>
            {JSON.stringify(actionState)}
            <br />
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

      expect(component.baseElement.textContent).toContain('"state":"COMPLETED"');
      expect(component.baseElement.textContent).toContain('"actionName":"createTodoForMe"');
      expect(component.baseElement.textContent).toContain('"error":null');
    });

    it('should return the ERROR state of the last action that was run, if it failed', () => {
      const iThrow = createAction('iThrow', {}, () => {
        throw new Error('Oh no I threw!');
      });

      const Component = () => {
        const actions = useActions();
        const actionState = useActionState();

        const runRoutine = () => {
          try {
            actions.run(iThrow());
          } catch (err) {
            // do nothing
          }
        };

        return (
          <div>
            state:{actionState.state}
            actionName:{actionState.actionName}
            error:{(actionState.error as Error)?.message}
            <br />
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

      expect(component.baseElement.textContent).toContain('state:ERROR');
      expect(component.baseElement.textContent).toContain('actionName:iThrow');
      expect(component.baseElement.textContent).toContain('error:Oh no I threw!');
    });

    describe('While focusing on a specific action (using "useActionState(specificAction)")', () => {
      it("should return the IDLE state if it's not the last action that was run", () => {
        const action1 = createAction('action1', {}, ({}) => {});
        const action2 = createAction('action2', {}, ({}) => {});

        const Component = () => {
          const actions = useActions();
          const actionState = useActionState(action1);

          const runRoutine = () => {
            actions.run(action1());
            actions.run(action2());
          };

          return (
            <div>
              {JSON.stringify(actionState)}
              <br />
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

        expect(component.baseElement.textContent).toContain('"state":"IDLE"');
        expect(component.baseElement.textContent).toContain('"actionName":""');
        expect(component.baseElement.textContent).toContain('"error":null');
      });

      it("should return the ONGOING state ONLY if it's specifically the currently running action", () => {
        const action1 = createAction('action1', {}, ({}) => new Promise<void>((res) => setTimeout(res, 500)));
        afterThis(() => waitForAsync());

        const Component = () => {
          const actions = useActions();
          const actionState = useActionState(action1);

          const runRoutine = () => {
            actions.run(action1());
          };

          return (
            <div>
              {JSON.stringify(actionState)}
              <br />
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

        expect(component.baseElement.textContent).toContain('"state":"ONGOING"');
        expect(component.baseElement.textContent).toContain('"actionName":"action1"');
        expect(component.baseElement.textContent).toContain('"error":null');
      });

      it("should not return the ONGOING state if the currently running action isn't the specified one", () => {
        const action1 = createAction('action1', {}, ({}) => new Promise<void>((res) => setTimeout(res, 500)));
        const action2 = createAction('action2', {}, ({}) => {});
        afterThis(() => waitForAsync());

        const Component = () => {
          const actions = useActions();
          const actionState = useActionState(action2);

          const runRoutine = () => {
            actions.run(action2());
            actions.run(action1());
          };

          return (
            <div>
              {JSON.stringify(actionState)}
              <br />
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

        expect(component.baseElement.textContent).toContain('"state":"IDLE"');
        expect(component.baseElement.textContent).toContain('"actionName":""');
        expect(component.baseElement.textContent).toContain('"error":null');
      });
    });

    describe('While focusing on a set of actions (using "useActionState([specificAction1, specificAction2])")', () => {
      it('should return the IDLE state if non of the actions is the last one to run', () => {
        const watchedAction1 = createAction('watchedAction1', {}, ({}) => {});
        const watchedAction2 = createAction('watchedAction2', {}, ({}) => {});
        const notWatchedAction = createAction('notWatchedAction', {}, ({}) => {});

        const Component = () => {
          const actions = useActions();
          const actionState = useActionState([watchedAction1, watchedAction2]);

          const runRoutine = () => {
            actions.run(watchedAction1());
            actions.run(watchedAction2());
            actions.run(notWatchedAction());
          };

          return (
            <div>
              {JSON.stringify(actionState)}
              <br />
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

        expect(component.baseElement.textContent).toContain('"state":"IDLE"');
        expect(component.baseElement.textContent).toContain('"actionName":""');
        expect(component.baseElement.textContent).toContain('"error":null');
      });

      it('should return the ONGOING for any of the specified actions, if one of them is the currently running action', () => {
        const watchedAction1 = createAction(
          'watchedAction1',
          {},
          ({}) => new Promise<void>((res) => setTimeout(res, 500))
        );
        const watchedAction2 = createAction('watchedAction2', {}, ({}) => {});
        afterThis(() => waitForAsync());

        const Component = () => {
          const actions = useActions();
          const actionState = useActionState([watchedAction1, watchedAction2]);

          const runRoutine = () => {
            actions.run(watchedAction1());
          };

          return (
            <div>
              {JSON.stringify(actionState)}
              <br />
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

        expect(component.baseElement.textContent).toContain('"state":"ONGOING"');
        expect(component.baseElement.textContent).toContain('"actionName":"watchedAction1"');
        expect(component.baseElement.textContent).toContain('"error":null');
      });

      it('should not return the ONGOING state, if none of them is the currently running action', () => {
        const watchedAction1 = createAction('watchedAction1', {}, ({}) => {});
        const watchedAction2 = createAction('watchedAction2', {}, ({}) => {});
        const notWatchedAction = createAction(
          'notWatchedAction',
          {},
          ({}) => new Promise<void>((res) => setTimeout(res, 500))
        );
        afterThis(() => waitForAsync());

        const Component = () => {
          const actions = useActions();
          const actionState = useActionState([watchedAction1, watchedAction2]);

          const runRoutine = () => {
            actions.run(watchedAction1());
            actions.run(watchedAction2());
            actions.run(notWatchedAction());
          };

          return (
            <div>
              {JSON.stringify(actionState)}
              <br />
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

        expect(component.baseElement.textContent).toContain('"state":"IDLE"');
        expect(component.baseElement.textContent).toContain('"actionName":""');
        expect(component.baseElement.textContent).toContain('"error":null');
      });
    });
  });

  describe('Canceling Actions', () => {
    it('should let you cancel an ongoing action using the "cancel" modifier', () => {
      afterThis(() => waitForAsync(1000));

      const waitSeconds = createAction('waitSeconds', {}, async ({}, seconds: number) => {
        await new Promise((res) => setTimeout(res, seconds * 1000));
      });

      const Component = () => {
        const actions = useActions();
        const actionState = useActionState();

        const runRoutine = () => {
          actions.run(waitSeconds(1));
          actions.cancel();
        };

        return (
          <div>
            {JSON.stringify(actionState)}
            <br />
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

      expect(component.baseElement.textContent).toContain('"state":"CANCELED"');
      expect(component.baseElement.textContent).toContain('"actionName":"waitSeconds"');
      expect(component.baseElement.textContent).toContain('"error":null');
    });

    it('should let you chain and run another action after cancelling the current one', () => {
      afterThis(() => waitForAsync(1000));

      const waitSeconds = createAction('waitSeconds', {}, async ({}, seconds: number) => {
        await new Promise((res) => setTimeout(res, seconds * 1000));
      });
      const anotherAction = createAction('anotherAction', {}, ({}) => {});

      const Component = () => {
        const actions = useActions();
        const actionState = useActionState();

        const runRoutine = () => {
          actions.run(waitSeconds(1));
          actions.cancel().run(anotherAction());
        };

        return (
          <div>
            {JSON.stringify(actionState)}
            <br />
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

      expect(component.baseElement.textContent).toContain('"state":"COMPLETED"');
      expect(component.baseElement.textContent).toContain('"actionName":"anotherAction"');
      expect(component.baseElement.textContent).toContain('"error":null');
    });

    it('should do nothing if there is no action to cancel', () => {
      const Component = () => {
        const actions = useActions();
        const actionState = useActionState();

        const runRoutine = () => {
          actions.cancel();
        };

        return (
          <div>
            {JSON.stringify(actionState)}
            <br />
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

      expect(component.baseElement.textContent).toContain('"state":"IDLE"');
      expect(component.baseElement.textContent).toContain('"actionName":""');
      expect(component.baseElement.textContent).toContain('"error":null');
    });

    it('should prevent the canceled action from registering as "completed" (EDGE CASE)', async () => {
      const waitSeconds = createAction('waitSeconds', {}, async ({}, seconds: number) => {
        await new Promise((res) => setTimeout(res, seconds * 1000));
      });

      const Component = () => {
        const actions = useActions();
        const actionState = useActionState();

        const runRoutine = () => {
          actions.run(waitSeconds(1));
          actions.cancel();
        };

        return (
          <div>
            {JSON.stringify(actionState)}
            <br />
            <button onClick={runRoutine}>Run Routine</button>
          </div>
        );
      };

      const component = render(
        <ConnvyProvider>
          <Component />
        </ConnvyProvider>
      );

      await act(async () => {
        fireEvent.click(component.getByText('Run Routine'));
        await waitForAsync(1000);
      });

      expect(component.baseElement.textContent).toContain('"state":"CANCELED"');
      expect(component.baseElement.textContent).toContain('"actionName":"waitSeconds"');
      expect(component.baseElement.textContent).toContain('"error":null');
    });

    describe('Cancelling a specific action (using "actions.cancel(specificAction)")', () => {
      it("should cancel it if it's running", () => {
        afterThis(() => waitForAsync(1000));

        const waitSeconds = createAction('waitSeconds', {}, async ({}, seconds: number) => {
          await new Promise((res) => setTimeout(res, seconds * 1000));
        });

        const Component = () => {
          const actions = useActions();
          const actionState = useActionState();

          const runRoutine = () => {
            actions.run(waitSeconds(1));
            actions.cancel(waitSeconds);
          };

          return (
            <div>
              {JSON.stringify(actionState)}
              <br />
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

        expect(component.baseElement.textContent).toContain('"state":"CANCELED"');
        expect(component.baseElement.textContent).toContain('"actionName":"waitSeconds"');
        expect(component.baseElement.textContent).toContain('"error":null');
      });

      it('should not cancel any other action', async () => {
        const actionToCancel = createAction('actionToCancel', {}, ({}) => {});
        const waitSeconds = createAction('waitSeconds', {}, async ({}, seconds: number) => {
          await new Promise((res) => setTimeout(res, seconds * 1000));
        });

        const Component = () => {
          const actions = useActions();
          const actionState = useActionState();

          const runRoutine = () => {
            actions.run(waitSeconds(1));
            actions.cancel(actionToCancel);
          };

          return (
            <div>
              {JSON.stringify(actionState)}
              <br />
              <button onClick={runRoutine}>Run Routine</button>
            </div>
          );
        };

        const component = render(
          <ConnvyProvider>
            <Component />
          </ConnvyProvider>
        );

        await act(async () => {
          fireEvent.click(component.getByText('Run Routine'));
          await waitForAsync(1000);
        });

        expect(component.baseElement.textContent).toContain('"state":"COMPLETED"');
        expect(component.baseElement.textContent).toContain('"actionName":"waitSeconds"');
        expect(component.baseElement.textContent).toContain('"error":null');
      });
    });

    describe('Cancelling a given set of actions (using "actions.cancel([specificAction1, specificAction2])")', () => {
      it("should cancel any of the given actions it if it's running", () => {
        afterThis(() => waitForAsync(1000));

        const waitSeconds = createAction('waitSeconds', {}, async ({}, seconds: number) => {
          await new Promise((res) => setTimeout(res, seconds * 1000));
        });
        const anotherAction = createAction('anotherAction', {}, ({}) => {});

        const Component = () => {
          const actions = useActions();
          const actionState = useActionState();

          const runRoutine = () => {
            actions.run(waitSeconds(1));
            actions.cancel([waitSeconds, anotherAction]);
          };

          return (
            <div>
              {JSON.stringify(actionState)}
              <br />
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

        expect(component.baseElement.textContent).toContain('"state":"CANCELED"');
        expect(component.baseElement.textContent).toContain('"actionName":"waitSeconds"');
        expect(component.baseElement.textContent).toContain('"error":null');
      });

      it('should not cancel any other action that is not in the set', async () => {
        const waitSeconds = createAction('waitSeconds', {}, async ({}, seconds: number) => {
          await new Promise((res) => setTimeout(res, seconds * 1000));
        });
        const anotherAction1 = createAction('anotherAction1', {}, ({}) => {});
        const anotherAction2 = createAction('anotherAction2', {}, ({}) => {});

        const Component = () => {
          const actions = useActions();
          const actionState = useActionState();

          const runRoutine = () => {
            actions.run(waitSeconds(1));
            actions.cancel([anotherAction1, anotherAction2]);
          };

          return (
            <div>
              {JSON.stringify(actionState)}
              <br />
              <button onClick={runRoutine}>Run Routine</button>
            </div>
          );
        };

        const component = render(
          <ConnvyProvider>
            <Component />
          </ConnvyProvider>
        );

        await act(async () => {
          fireEvent.click(component.getByText('Run Routine'));
          await waitForAsync(1000);
        });

        expect(component.baseElement.textContent).toContain('"state":"COMPLETED"');
        expect(component.baseElement.textContent).toContain('"actionName":"waitSeconds"');
        expect(component.baseElement.textContent).toContain('"error":null');
      });
    });
  });

  describe('Store State Isolation', () => {
    it("should not reflect any changes made to the store outside of the action, while it's still ongoing", async () => {
      const createAndThenWait = createAction('createAndThenWait', { todosStore }, async ({ todosStore }) => {
        todosStore.create({ title: 'I was created', checked: true, owner: 'me' });
        await new Promise((res) => setTimeout(res, 1000));
      });

      const Component = () => {
        const todos = useStore(todosStore);
        const actions = useActions();

        const runRoutine = async () => {
          await actions.run(createAndThenWait());
        };

        return (
          <div>
            Todos count: {todos.list().length}
            <button onClick={runRoutine}>Run Routine</button>
          </div>
        );
      };

      const component = render(
        <ConnvyProvider>
          <Component />
        </ConnvyProvider>
      );

      await act(async () => {
        fireEvent.click(component.getByText('Run Routine'));
        await waitForAsync(500);
      });

      expect(component.baseElement.textContent).toContain('Todos count: 0');

      await act(async () => {
        await waitForAsync(600);
      });

      expect(component.baseElement.textContent).toContain('Todos count: 1');
    });

    it('should not let anyone outside of the action to write to the affected stores', async () => {
      afterThis(() => waitForAsync(1000));

      const createAndThenWait = createAction('createAndThenWait', { todosStore }, async ({ todosStore }) => {
        todosStore.create({ title: 'I was created', checked: true, owner: 'me' });
        await new Promise((res) => setTimeout(res, 1000));
      });

      const Component = () => {
        const todos = useStore(todosStore);
        const actions = useActions();
        const [error, setError] = useState('');

        const runRoutine = async () => {
          actions.run(createAndThenWait());
          try {
            todos.create({ title: 'I should not be created', owner: 'No one', checked: false });
          } catch (err) {
            setError(`${err}`);
          }
        };

        return (
          <div>
            Todos count: {todos.list().length}
            Error: {error}
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

      expect(component.baseElement.textContent).toContain('Todos count: 0');
      expect(component.baseElement.textContent).toContain(
        'You cannot write into the the store "todos", as it is locked and being used somewhere else.' +
          'In order to avoid race conditions, we suggest wrapping your write operations with Actions.'
      );
    });

    it('should let other routines to write to unaffected stores (ones not required by the action)', async () => {
      afterThis(() => waitForAsync(1000));

      const createAndThenWait = createAction('createAndThenWait', { todosStore }, async ({ todosStore }) => {
        todosStore.create({ title: 'I was created', checked: true, owner: 'me' });
        await new Promise((res) => setTimeout(res, 1000));
      });

      const bagelsStore = createStore('bagels', { schema: ($) => ({ fresh: $.boolean() }) });

      const Component = () => {
        const bagels = useStore(bagelsStore);
        const actions = useActions();
        const [error, setError] = useState('No Error');

        const runRoutine = () => {
          actions.run(createAndThenWait());
          try {
            bagels.create({ fresh: true });
          } catch (err) {
            setError(`${err}`);
          }
        };

        return (
          <div>
            Bagels count: {bagels.list().length}
            Error: {error}
            <button onClick={runRoutine}>Run Routine</button>
          </div>
        );
      };

      const component = render(
        <ConnvyProvider>
          <Component />
        </ConnvyProvider>
      );

      await act(async () => {
        fireEvent.click(component.getByText('Run Routine'));
      });

      expect(component.baseElement.textContent).toContain('Bagels count: 1');
      expect(component.baseElement.textContent).toContain('Error: No Error');
    });

    describe('When action has failed', () => {
      it('should not commit any of the changes it made to the stores', () => {
        const createTodoThenFail = createAction(
          'createTodoThenFail',
          { todosStore },
          ({ todosStore }, title: string) => {
            todosStore.create({ title, owner: 'me', checked: false });
            throw new Error('Oh no I threw!');
          }
        );

        const Component = () => {
          const todos = useStore(todosStore);
          const actions = useActions();
          const actionState = useActionState();

          const runRoutine = () => {
            try {
              actions.run(createTodoThenFail('Not gonna happen'));
            } catch (err) {
              // do nothing
            }
          };

          return (
            <div>
              Action State: {actionState.state}
              Todos Count: {todos.list().length}
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

        expect(component.baseElement.textContent).toContain('Action State: ERROR');
        expect(component.baseElement.textContent).toContain('Todos Count: 0');
      });
    });

    describe('When action was cancelled', () => {
      it('should not commit any of the changes it made to the stores', async () => {
        const createAndThenWait = createAction('createAndThenWait', { todosStore }, async ({ todosStore }) => {
          todosStore.create({ title: 'I was created', checked: true, owner: 'me' });
          await new Promise((res) => setTimeout(res, 500));
        });

        const Component = () => {
          const todos = useStore(todosStore);
          const actions = useActions();
          const actionState = useActionState();

          const runRoutine = async () => {
            actions.run(createAndThenWait());
            await waitForAsync(100);
            actions.cancel();
          };

          return (
            <div>
              Action State: {actionState.state}
              Todos Count: {todos.list().length}
              <button onClick={runRoutine}>Run Routine</button>
            </div>
          );
        };

        const component = render(
          <ConnvyProvider>
            <Component />
          </ConnvyProvider>
        );

        await act(async () => {
          fireEvent.click(component.getByText('Run Routine'));
          await waitForAsync(600);
        });

        expect(component.baseElement.textContent).toContain('Action State: CANCELED');
        expect(component.baseElement.textContent).toContain('Todos Count: 0');
      });
    });
  });
});
