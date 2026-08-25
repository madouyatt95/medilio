// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDemoData } from '../src/utils/demoData';
import storageService from '../src/services/storageService';

describe('demo data bootstrap', () => {
  beforeAll(() => {
    const values = new Map();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key),
        clear: () => values.clear(),
      },
    });
  });

  beforeEach(() => localStorage.clear());

  it('seeds every commercial role used for browser acceptance tests', () => {
    seedDemoData();

    expect(storageService.getUsers().map(user => user.role)).toEqual(
      expect.arrayContaining(['admin', 'patient', 'professional', 'establishment']),
    );
  });

  it('repairs an incomplete seed instead of keeping an unusable demo', () => {
    localStorage.setItem('medilio_demo_v8', 'true');
    storageService.setUsers([]);

    seedDemoData();

    expect(storageService.getUsers().some(user => user.email === 'famille.dupont@email.fr')).toBe(true);
  });
});
