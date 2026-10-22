import { describe, expect, it } from 'vitest';
import { parseSharedConfig } from './config.js';
import { SHARED_INFO } from './info.js';

const ids = Object.keys(SHARED_INFO);
const defaults = { info: ['elevation', 'azimuth'] };
const parse = (raw: unknown) => parseSharedConfig(raw, ids, defaults);

describe('parseSharedConfig', () => {
  it('fills defaults', () => {
    expect(parse({ type: 'custom:ephemeris-sky-card' })).toEqual({
      title: undefined,
      controls: 'full',
      resetAfter: 60,
      info: ['elevation', 'azimuth'],
    });
  });

  it('accepts every option', () => {
    expect(parse({ title: false, controls: 'none', reset_after: 0, info: ['sunset'] })).toEqual({
      title: false,
      controls: 'none',
      resetAfter: 0,
      info: ['sunset'],
    });
    expect(parse({ title: '  ' }).title).toBeUndefined();
  });

  it.each([
    [null, 'must be an object'],
    [[], 'must be an object'],
    [{ title: 3 }, '"title"'],
    [{ title: 'x'.repeat(61) }, 'at most 60'],
    [{ controls: 'some' }, '"controls"'],
    [{ reset_after: -1 }, '"reset_after"'],
    [{ reset_after: 1.5 }, '"reset_after"'],
    [{ reset_after: '60' }, '"reset_after"'],
    [{ info: 'elevation' }, 'must be a list'],
    [{ info: ['nope'] }, 'Unknown info box "nope"'],
    [{ info: ['sunset', 'sunset'] }, 'listed twice'],
    [{ info: ids.slice(0, 7) }, 'at most 6'],
  ])('rejects %j', (raw, message) => {
    expect(() => parse(raw)).toThrow(message);
  });
});
