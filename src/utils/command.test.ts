import { describe, expect, it } from 'vitest';

import { commandToModule } from './command.js';

describe('commandToModule', () => {
  it('handles one-word command', () =>
    expect(commandToModule('build')).toBe('build'));

  it('handles hyphened command', () =>
    expect(commandToModule('build-package')).toBe('buildPackage'));
});
