import {
  parseFourSegment,
  compareFourSegment,
  isHotfixOrReleaseBranch,
  extractBase,
  computeFourSegmentVersion,
  filterTagsByPrefix,
} from '../four-segment.js';

// ---------------------------------------------------------------------------
// computeFourSegmentVersion — spec cases (Section 5 of spec.md)
// ---------------------------------------------------------------------------

describe('computeFourSegmentVersion — spec cases', () => {
  it.each([
    // [description, tags, branch, prefix, expected]
    ['case 1: first 4-seg on hotfix → 1.3.0.1', ['1.3.0'], 'hotfix/1.3.0-critical', '', '1.3.0.1'],
    [
      'case 2: increment existing HOTFIX (latest 1.3.0.4) → 1.3.0.5',
      ['1.3.0', '1.3.0.1', '1.3.0.2', '1.3.0.3', '1.3.0.4'],
      'hotfix/1.3.0-critical',
      '',
      '1.3.0.5',
    ],
    ['case 3: main branch emits 3-seg (latest 1.3.0) → 1.4.0', ['1.3.0', '1.2.0', '1.1.0'], 'main', '', '1.4.0'],
    [
      'case 4: integer comparison: 1.3.0.9 and 1.3.0.10 → next is 1.3.0.11',
      ['1.3.0', '1.3.0.1', '1.3.0.9', '1.3.0.10'],
      'hotfix/1.3.0-x',
      '',
      '1.3.0.11',
    ],
    ['case 6: release/** branch: no 4-seg for 2.0.1 → 2.0.1.1', ['2.0.1'], 'release/2.0.1', '', '2.0.1.1'],
    [
      'case 7: mixed state: 1.4.0 and 1.3.0.5 coexist → hotfix/1.3.0-x gives 1.3.0.6',
      ['1.3.0', '1.4.0', '1.3.0.5'],
      'hotfix/1.3.0-x',
      '',
      '1.3.0.6',
    ],
  ])('%s', (_desc, tags, branch, prefix, expected) => {
    expect(computeFourSegmentVersion(tags, branch, prefix)).toBe(expected);
  });

  it('case 8: no existing tags → hotfix branch → throw (missing base)', () => {
    expect(() => computeFourSegmentVersion([], 'hotfix/0.1.0-init', '')).toThrow(
      /base 3-segment tag.*0\.1\.0.*to exist/,
    );
  });
});

// ---------------------------------------------------------------------------
// Version prefix support
// Tags arriving here are already prefix-stripped (as getRawTags produces them).
// The prefix is only applied to the OUTPUT.
// ---------------------------------------------------------------------------

describe('version prefix', () => {
  it.each([
    ['v prefix: first hotfix', ['1.3.0'], 'hotfix/1.3.0-x', 'v', 'v1.3.0.1'],
    ['v prefix: increments existing 4-seg', ['1.3.0', '1.3.0.3'], 'hotfix/1.3.0-fix', 'v', 'v1.3.0.4'],
    ['v prefix: main branch', ['2.0.0', '1.9.0'], 'main', 'v', 'v2.1.0'],
  ])('%s', (_desc, tags, branch, prefix, expected) => {
    expect(computeFourSegmentVersion(tags, branch, prefix)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// Branch validation
// ---------------------------------------------------------------------------

describe('branch validation', () => {
  it.each([
    ['feature/my-feature', /four-segment mode requires branch-name/],
    ['develop', /four-segment mode requires branch-name/],
  ])('throws on "%s"', (branch, pattern) => {
    expect(() => computeFourSegmentVersion(['1.0.0'], branch, '')).toThrow(pattern);
  });

  it('throws on release/** branch whose version base is not in tags', () => {
    expect(() => computeFourSegmentVersion(['1.0.0'], 'release/2.5.0', '')).toThrow(/base 3-segment tag/);
  });
});

// ---------------------------------------------------------------------------
// parseFourSegment
// ---------------------------------------------------------------------------

describe('parseFourSegment', () => {
  it.each([
    ['1.3.0.4', { major: 1, minor: 3, patch: 0, hotfix: 4 }],
    ['0.0.0.0', { major: 0, minor: 0, patch: 0, hotfix: 0 }],
  ])('parses %s', (tag, expected) => {
    expect(parseFourSegment(tag)).toEqual(expected);
  });

  it.each([['1.3.0'], ['1.3.0.4.2'], ['1.3.x.4']])('returns null for "%s"', (tag) => {
    expect(parseFourSegment(tag)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// compareFourSegment — integer ordering
// ---------------------------------------------------------------------------

describe('compareFourSegment — integer ordering', () => {
  const v = (major: number, minor: number, patch: number, hotfix: number) => ({ major, minor, patch, hotfix });

  it('1.3.0.9 < 1.3.0.10 (integer, not lexicographic)', () => {
    expect(compareFourSegment(v(1, 3, 0, 9), v(1, 3, 0, 10))).toBeLessThan(0);
  });

  it('1.3.0.10 > 1.3.0.9', () => {
    expect(compareFourSegment(v(1, 3, 0, 10), v(1, 3, 0, 9))).toBeGreaterThan(0);
  });

  it('equal versions', () => {
    expect(compareFourSegment(v(1, 3, 0, 4), v(1, 3, 0, 4))).toBe(0);
  });

  it('major takes precedence over all other segments', () => {
    expect(compareFourSegment(v(2, 0, 0, 0), v(1, 9, 9, 9))).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// isHotfixOrReleaseBranch
// ---------------------------------------------------------------------------

describe('isHotfixOrReleaseBranch', () => {
  it.each([
    ['hotfix/1.3.0-x', true],
    ['release/2.0.1', true],
    ['main', false],
    ['feature/foo', false],
  ])('"%s" → %s', (branch, expected) => {
    expect(isHotfixOrReleaseBranch(branch)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// extractBase
// ---------------------------------------------------------------------------

describe('extractBase', () => {
  it.each([
    ['hotfix/1.3.0-critical', '1.3.0'],
    ['release/2.0.1', '2.0.1'],
    ['hotfix/0.1.0-init', '0.1.0'],
  ])('extracts from "%s" → "%s"', (branch, expected) => {
    expect(extractBase(branch)).toBe(expected);
  });

  it('throws on missing slash', () => {
    expect(() => extractBase('mainbranch')).toThrow(/Cannot extract version base/);
  });

  it('throws on non-version after slash', () => {
    expect(() => extractBase('hotfix/no-version-here')).toThrow(/does not start with MAJOR.MINOR.PATCH/);
  });
});

// ---------------------------------------------------------------------------
// filterTagsByPrefix — prefix filter applied by getRawTags before four-segment
// ---------------------------------------------------------------------------

describe('filterTagsByPrefix', () => {
  it('with prefix "v": excludes unprefixed tags, strips prefix from matching tags', () => {
    const raw = ['v1.3.0', '2.0.0', 'v1.3.0.1', 'unrelated-thing'];
    expect(filterTagsByPrefix(raw, 'v')).toEqual(['1.3.0', '1.3.0.1']);
  });

  it('with prefix "": all tags pass through unchanged (default behavior preserved)', () => {
    const raw = ['1.3.0', '2.0.0', '1.3.0.1'];
    expect(filterTagsByPrefix(raw, '')).toEqual(['1.3.0', '2.0.0', '1.3.0.1']);
  });

  it('with prefix "v": mixed tag repo — unprefixed "2.0.0" does not become wrong base', () => {
    // Simulates a repo where some tags have "v" prefix and some don't.
    // Before the fix, "2.0.0" would survive prefix-stripping unchanged and
    // pollute the tag list seen by computeHotfixVersion / computeMainVersion.
    const raw = ['v1.3.0', '2.0.0'];
    const filtered = filterTagsByPrefix(raw, 'v');
    expect(filtered).toContain('1.3.0');
    expect(filtered).not.toContain('2.0.0');
  });

  it('with prefix "v": filtered result feeds computeFourSegmentVersion without false missing-base', () => {
    // hotfix/1.3.0-x requires "1.3.0" in the tag list.
    // Raw git tags: ['v1.3.0', '2.0.0']. After filter: ['1.3.0'].
    // Without the fix, '2.0.0' would appear in rawTags and not match the base,
    // but '1.3.0' would still be present — the real danger is the converse:
    // if versionPrefix='v' and only '2.0.0' were present (no 'v1.3.0'), the
    // base would be missing. Confirm the filtered list gives the correct result.
    const raw = ['v1.3.0', '2.0.0'];
    const filtered = filterTagsByPrefix(raw, 'v');
    expect(computeFourSegmentVersion(filtered, 'hotfix/1.3.0-x', 'v')).toBe('v1.3.0.1');
  });

  it('with prefix "v": only unprefixed tags → base missing → throws (not wrong base)', () => {
    // If the repo has only '2.0.0' (no 'v' prefix) and prefix is 'v',
    // filtered list is empty → missing base → correct throw, not a wrong-base silent bug.
    const raw = ['2.0.0'];
    const filtered = filterTagsByPrefix(raw, 'v');
    expect(() => computeFourSegmentVersion(filtered, 'hotfix/1.3.0-x', 'v')).toThrow(
      /base 3-segment tag.*1\.3\.0.*to exist/,
    );
  });
});
