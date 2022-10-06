import React from 'react';
import { Chance } from 'chance';
import { fireEvent, render } from '@testing-library/react';
import {
  ConnvyProvider,
  createAction,
  createSelector,
  createStore,
  createTool,
  useActions,
  useSelector,
  useStore,
  useTool,
} from '../src';
import { act } from 'react-dom/test-utils';

describe('Connvy Tools', () => {
  it('should allow using tools from components, using the "useTool" hook', () => {
    const secret = `secret_${Chance().hash()}`;
    const secretTool = createTool('secret', { create: () => ({ secret }) });

    const Component = () => {
      const secret = useTool(secretTool);
      return <div>secret is: {secret.secret}</div>;
    };

    const component = render(
      <ConnvyProvider>
        <Component />
      </ConnvyProvider>
    );

    expect(component.baseElement.textContent).toContain(`secret is: ${secret}`);
  });

  it('should allow using tools from selectors', () => {
    const secret = `secret_${Chance().hash()}`;
    const secretTool = createTool('secret', { create: () => ({ secret }) });
    const getSecret = createSelector({ secretTool }, ({ secretTool }) => secretTool.secret);

    const Component = () => {
      const [secret] = useSelector(getSecret());
      return <div>secret is: {secret}</div>;
    };

    const component = render(
      <ConnvyProvider>
        <Component />
      </ConnvyProvider>
    );

    expect(component.baseElement.textContent).toContain(`secret is: ${secret}`);
  });

  it('should allow using tools from actions', () => {
    const secret = `secret_${Chance().hash()}`;
    const secretTool = createTool('secret', { create: () => ({ secret }) });
    const secretsStore = createStore('todos', { schema: ($) => ({ secret: $.string() }) });
    const putSecretInStore = createAction(
      'putSecretInStore',
      { secretTool, secretsStore },
      ({ secretTool, secretsStore }) => {
        secretsStore.create({ secret: secretTool.secret });
      }
    );

    const Component = () => {
      const secrets = useStore(secretsStore);
      const actions = useActions();

      const onClick = () => {
        actions.run(putSecretInStore());
      };

      return (
        <div>
          secret is: {secrets.get(0, { fallback: { secret: '' } }).secret}
          <br />
          <button onClick={onClick}>Click Me</button>
        </div>
      );
    };

    const component = render(
      <ConnvyProvider>
        <Component />
      </ConnvyProvider>
    );

    act(() => {
      fireEvent.click(component.getByText('Click Me'));
    });

    expect(component.baseElement.textContent).toContain(`secret is: ${secret}`);
  });
});
