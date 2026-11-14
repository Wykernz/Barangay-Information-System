import { afterEach, expect, test, vi } from 'vitest';
import { api, getSession } from './api';
import { AxiosError } from 'axios';

afterEach(() => vi.restoreAllMocks());

test('an expired session returns to login', async () => {
  vi.spyOn(api, 'get').mockRejectedValue(new AxiosError('Forbidden', undefined, undefined, undefined, {
    status: 403, statusText: 'Forbidden', data: {}, headers: {}, config: {} as never,
  }));
  expect(await getSession()).toBeNull();
});

test('connection failures remain visible instead of appearing as logged out', async () => {
  vi.spyOn(api, 'get').mockRejectedValue(new Error('Network unavailable'));
  await expect(getSession()).rejects.toThrow('Network unavailable');
});
