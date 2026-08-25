import { describe, expect, it } from 'vitest';
import { withTimeout } from '../src/utils/async';

describe('withTimeout', () => {
  it('returns a completed operation', async () => {
    await expect(withTimeout(Promise.resolve('ok'), { timeout: 50 })).resolves.toBe('ok');
  });

  it('stops an endless loading state with a useful error', async () => {
    const never = new Promise(() => {});
    await expect(withTimeout(never, { timeout: 5, message: 'Délai dépassé' }))
      .rejects.toThrow('Délai dépassé');
  });
});
