import { describe, expect, it } from 'vitest';
import { buildQuery, enumParam, intParam } from '../../src/store/url-state';

describe('url state', () => {
  it('parses and clamps integers', () => {
    expect(intParam('n', 16, 1, 64, '?n=32')).toBe(32);
    expect(intParam('n', 16, 1, 64, '?n=999')).toBe(64);
    expect(intParam('n', 16, 1, 64, '?n=abc')).toBe(16);
    expect(intParam('n', 16, 1, 64, '')).toBe(16);
  });

  it('accepts only allowed enum values', () => {
    expect(enumParam('a', ['x', 'y'] as const, 'x', '?a=y')).toBe('y');
    expect(enumParam('a', ['x', 'y'] as const, 'x', '?a=z')).toBe('x');
  });

  it('round-trips a module configuration', () => {
    const q = buildQuery('search', { algo: 'binary', n: 16, step: 3 });
    expect(q).toBe('?m=search&algo=binary&n=16&step=3');
    expect(intParam('step', 0, 0, 100, q)).toBe(3);
    expect(enumParam('algo', ['linear', 'binary'] as const, 'linear', q)).toBe('binary');
  });
});
