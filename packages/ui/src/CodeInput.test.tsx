import { ElementDefinition, MedplumClient, ValueSet } from '@medplum/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { CodeInput } from './CodeInput';
import { MedplumProvider } from './MedplumProvider';

const statusProperty: ElementDefinition = {
  binding: {
    valueSet: 'https://example.com/test'
  }
};

const mockRouter = {
  push: (path: string, state: any) => {
    console.log('Navigate to: ' + path + ' (state=' + JSON.stringify(state) + ')');
  },
  listen: () => (() => undefined) // Return mock "unlisten" handler
}

const valueSet: ValueSet = {
  resourceType: 'ValueSet',
  expansion: {
    contains: [{
      system: 'x',
      code: 'test-code',
      display: 'Test Display'
    }]
  }
};

function mockFetch(url: string, options: any): Promise<any> {
  let result: any;

  if (url.endsWith('/fhir/R4/ValueSet/%24expand?url=https%3A%2F%2Fexample.com%2Ftest&filter=xyz')) {
    result = valueSet;
  }

  const response: any = {
    request: {
      url,
      options
    },
    ...result
  };

  return Promise.resolve({
    blob: () => Promise.resolve(response),
    json: () => Promise.resolve(response)
  });
}

const medplum = new MedplumClient({
  baseUrl: 'https://example.com/',
  clientId: 'my-client-id',
  fetch: mockFetch
});

describe('CodeInput', () => {

  beforeAll(async () => {
    await medplum.signIn('admin@medplum.com', 'admin', 'practitioner', 'openid');
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test('Renders', () => {
    render(
      <MedplumProvider medplum={medplum} router={mockRouter}>
        <CodeInput property={statusProperty} name="test" />
      </MedplumProvider>
    );

    expect(screen.getByTestId('autocomplete')).not.toBeUndefined();
  });

  test('Renders string default value', () => {
    render(
      <MedplumProvider medplum={medplum} router={mockRouter}>
        <CodeInput property={statusProperty} name="test" defaultValue="xyz" />
      </MedplumProvider>
    );

    expect(screen.getByTestId('autocomplete')).not.toBeUndefined();
    expect(screen.getByText('xyz')).not.toBeUndefined();
  });

  test('Searches for results', async () => {
    render(
      <MedplumProvider medplum={medplum} router={mockRouter}>
        <CodeInput property={statusProperty} name="test" />
      </MedplumProvider>
    );

    const input = screen.getByTestId('input-element') as HTMLInputElement;

    // Enter random text
    await act(async () => {
      fireEvent.change(input, { target: { value: 'xyz' } });
    });

    // Wait for the drop down
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await waitFor(() => screen.getByTestId('dropdown'));
    });

    // Press "Enter"
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });

    expect(screen.getByText('Test Display')).not.toBeUndefined();
  });

});
