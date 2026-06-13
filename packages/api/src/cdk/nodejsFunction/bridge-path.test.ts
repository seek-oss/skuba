import { describe, expect, it, vi } from 'vitest';

import { resolveRolldownBridge } from './bridge-path.js';
import { ValidationError } from './errors.js';

vi.mock('node:fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs')>();
  return { ...original, existsSync: vi.fn().mockReturnValue(false) };
});

describe('resolveRolldownBridge', () => {
  it('throws when no package root can be located', () => {
    expect(() => resolveRolldownBridge()).toThrow(ValidationError);
    expect(() => resolveRolldownBridge()).toThrow(/package root/);
  });
});
