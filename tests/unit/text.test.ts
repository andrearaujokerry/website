import { describe, expect, test } from 'vitest';
import { splitEmphasis, stripEmphasis } from '../../src/lib/text';

describe('splitEmphasis', () => {
  test('marks the words between asterisks as emphasised', () => {
    expect(splitEmphasis('I turn *messy data* into dashboards.')).toEqual([
      { text: 'I turn ', em: false },
      { text: 'messy data', em: true },
      { text: ' into dashboards.', em: false },
    ]);
  });

  test('handles emphasis at the start, at the end, and more than once', () => {
    expect(splitEmphasis('*Hello* there, *friend*')).toEqual([
      { text: 'Hello', em: true },
      { text: ' there, ', em: false },
      { text: 'friend', em: true },
    ]);
  });

  test('leaves copy without asterisks as one plain part', () => {
    expect(splitEmphasis('Plain words.')).toEqual([{ text: 'Plain words.', em: false }]);
  });

  test('returns nothing for empty copy', () => {
    expect(splitEmphasis('')).toEqual([]);
  });
});

describe('stripEmphasis', () => {
  test('removes every asterisk and keeps the words', () => {
    expect(stripEmphasis("Things I've *built*, *mostly* for fun.")).toBe(
      "Things I've built, mostly for fun.",
    );
  });
});
