/**
 * Four-segment versioning: MAJOR.MINOR.PATCH.HOTFIX
 *
 * Emit 4-segment only on release/** or hotfix/** branches.
 * Emit 3-segment from main (when version-scheme=four-segment).
 *
 * All comparisons are integer-based (no lexicographic ordering).
 * Tags arrive already prefix-stripped (stripped by getRawTags in git.ts).
 */
import * as semver from 'semver';

/**
 * Filter raw git tags to those carrying the configured prefix, then strip it.
 * When versionPrefix is '' (the default), all tags pass (startsWith('') is always true).
 */
export const filterTagsByPrefix = (rawTags: string[], versionPrefix: string): string[] =>
  rawTags.filter((t) => t.startsWith(versionPrefix)).map((t) => t.slice(versionPrefix.length));

export interface FourSegment {
  major: number;
  minor: number;
  patch: number;
  hotfix: number;
}

/** Parse a 4-segment tag string. Returns null if invalid. */
export const parseFourSegment = (tag: string): FourSegment | null => {
  const parts = tag.split('.');
  if (parts.length !== 4 || !parts.every((p) => /^\d+$/.test(p))) return null;
  const [major, minor, patch, hotfix] = parts.map(Number);
  return { major, minor, patch, hotfix };
};

/** Integer comparator for 4-segment versions. Returns negative, 0, or positive. */
export const compareFourSegment = (a: FourSegment, b: FourSegment): number => {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  return a.hotfix - b.hotfix;
};

/** True if branch is a hotfix or release branch. */
export const isHotfixOrReleaseBranch = (branchName: string): boolean => {
  return branchName.startsWith('release/') || branchName.startsWith('hotfix/');
};

/**
 * Given a list of prefix-stripped tag strings, compute the next four-segment
 * version for the given branch.
 *
 * On hotfix/** or release/** branches:
 *   - Derives the base (MAJOR.MINOR.PATCH) from the branch name.
 *   - Finds the highest existing 4-seg tag matching that base.
 *   - Returns base + ".{max_hotfix + 1}"; if none, returns base + ".1".
 *   - Throws if the base 3-seg tag does not exist in the tag list.
 *
 * On main (when version-scheme=four-segment):
 *   - Finds the highest 3-seg tag, increments MINOR, returns 3-segment.
 *
 * Throws on invalid branch name for four-segment mode.
 */
export const computeFourSegmentVersion = (
  rawTags: string[],
  branchName: string,
  versionPrefix: string,
): string => {
  if (branchName === 'main') {
    return computeMainVersion(rawTags, versionPrefix);
  }

  if (!isHotfixOrReleaseBranch(branchName)) {
    throw new Error(
      `four-segment mode requires branch-name to be "main", "release/**", or "hotfix/**". Got: "${branchName}"`,
    );
  }

  return computeHotfixVersion(rawTags, branchName, versionPrefix);
};

const computeMainVersion = (rawTags: string[], versionPrefix: string): string => {
  // Tags are already prefix-stripped; find the highest valid 3-segment tag via semver
  const highest = rawTags.reduce<semver.SemVer | null>((max, t) => {
    const v = semver.parse(t);
    if (!v) return max;
    return max === null || semver.gt(v, max) ? v : max;
  }, null);

  if (!highest) {
    return `${versionPrefix}0.1.0`;
  }

  // On main with four-segment mode, bump MINOR (starting a new release line).
  // Example from spec: 1.3.0 → 1.4.0 (spec Section 5, case 3).
  return `${versionPrefix}${highest.major}.${highest.minor + 1}.0`;
};

const computeHotfixVersion = (rawTags: string[], branchName: string, versionPrefix: string): string => {
  const base = extractBase(branchName);

  // Single pass: check base exists + collect matching 4-seg tags
  let baseExists = false;
  let maxFourSeg: FourSegment | null = null;
  for (const t of rawTags) {
    if (t === base) {
      baseExists = true;
      continue;
    }
    const v = parseFourSegment(t);
    if (v && `${v.major}.${v.minor}.${v.patch}` === base) {
      if (maxFourSeg === null || compareFourSegment(v, maxFourSeg) > 0) {
        maxFourSeg = v;
      }
    }
  }

  if (!baseExists) {
    throw new Error(
      `four-segment mode requires a base 3-segment tag "${versionPrefix}${base}" to exist. ` +
      `No such tag found. Cannot anchor hotfix version. ` +
      `Available tags: ${rawTags.slice(0, 10).join(', ')}`,
    );
  }

  if (maxFourSeg === null) {
    // No existing 4-seg tags for this base — start at .1
    return `${versionPrefix}${base}.1`;
  }

  return `${versionPrefix}${maxFourSeg.major}.${maxFourSeg.minor}.${maxFourSeg.patch}.${maxFourSeg.hotfix + 1}`;
};

/**
 * Extract the MAJOR.MINOR.PATCH base from a branch name.
 * Expects branch like "hotfix/1.3.0-critical" or "release/2.0.1".
 * Takes everything after the "/" up to (not including) the first "-" that follows a version.
 */
export const extractBase = (branchName: string): string => {
  const slashIdx = branchName.indexOf('/');
  if (slashIdx === -1) {
    throw new Error(`Cannot extract version base from branch name: "${branchName}"`);
  }

  const afterSlash = branchName.slice(slashIdx + 1);

  // Match leading MAJOR.MINOR.PATCH at the start of afterSlash
  const match = afterSlash.match(/^(\d+\.\d+\.\d+)/);
  if (!match) {
    throw new Error(
      `Branch name "${branchName}" does not start with MAJOR.MINOR.PATCH after the slash. ` +
      `Expected format: release/X.Y.Z or hotfix/X.Y.Z-description`,
    );
  }

  return match[1];
};
