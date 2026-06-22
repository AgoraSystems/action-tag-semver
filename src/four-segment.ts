/**
 * Four-segment versioning: MAJOR.MINOR.PATCH.HOTFIX
 *
 * Emit 4-segment only on release/** or hotfix/** branches.
 * Emit 3-segment from main (when version-scheme=four-segment).
 *
 * All comparisons are integer-based (no lexicographic ordering).
 */

export interface FourSegment {
  major: number;
  minor: number;
  patch: number;
  hotfix: number;
}

export interface ThreeSegment {
  major: number;
  minor: number;
  patch: number;
}

/** Returns true if the tag string is a valid 4-segment version. */
export const isFourSegment = (tag: string): boolean => {
  const parts = tag.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d+$/.test(p));
};

/** Returns true if the tag string is a valid 3-segment version. */
export const isThreeSegment = (tag: string): boolean => {
  const parts = tag.split('.');
  if (parts.length !== 3) return false;
  return parts.every((p) => /^\d+$/.test(p));
};

/** Parse a 4-segment tag string. Returns null if invalid. */
export const parseFourSegment = (tag: string): FourSegment | null => {
  if (!isFourSegment(tag)) return null;
  const [major, minor, patch, hotfix] = tag.split('.').map(Number);
  return { major, minor, patch, hotfix };
};

/** Parse a 3-segment tag string. Returns null if invalid. */
export const parseThreeSegment = (tag: string): ThreeSegment | null => {
  if (!isThreeSegment(tag)) return null;
  const [major, minor, patch] = tag.split('.').map(Number);
  return { major, minor, patch };
};

/** Integer comparator for 4-segment versions. Returns negative, 0, or positive. */
export const compareFourSegment = (a: FourSegment, b: FourSegment): number => {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  return a.hotfix - b.hotfix;
};

/** Integer comparator for 3-segment versions. Returns negative, 0, or positive. */
export const compareThreeSegment = (a: ThreeSegment, b: ThreeSegment): number => {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
};

/** True if branch is a hotfix or release branch. */
export const isHotfixOrReleaseBranch = (branchName: string): boolean => {
  return branchName.startsWith('release/') || branchName.startsWith('hotfix/');
};

/**
 * Given a list of raw tag strings (with prefix already removed), compute the
 * next four-segment version for the given branch.
 *
 * On hotfix/** or release/** branches:
 *   - Derives the base (MAJOR.MINOR.PATCH) from the branch name.
 *   - Finds the highest existing 4-seg tag matching that base.
 *   - Returns base + ".{max_hotfix + 1}"; if none, returns base + ".1".
 *   - Throws if the base 3-seg tag does not exist in the tag list.
 *
 * On main (when version-scheme=four-segment):
 *   - Finds the highest 3-seg tag, increments PATCH, returns 3-segment.
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
  const stripped = rawTags.map((t) => t.startsWith(versionPrefix) ? t.slice(versionPrefix.length) : t);
  const threeSeg = stripped
    .map(parseThreeSegment)
    .filter((v): v is ThreeSegment => v !== null)
    .sort((a, b) => compareThreeSegment(b, a)); // descending

  if (threeSeg.length === 0) {
    return `${versionPrefix}0.1.0`;
  }

  // On main with four-segment mode, bump MINOR (starting a new release line).
  // Example from spec: 1.3.0 → 1.4.0 (spec Section 5, case 3).
  const highest = threeSeg[0];
  return `${versionPrefix}${highest.major}.${highest.minor + 1}.0`;
};

const computeHotfixVersion = (rawTags: string[], branchName: string, versionPrefix: string): string => {
  const base = extractBase(branchName);
  const stripped = rawTags.map((t) => t.startsWith(versionPrefix) ? t.slice(versionPrefix.length) : t);

  // Check that the base 3-seg tag exists (anchor requirement)
  const baseExists = stripped.some((t) => t === base);
  if (!baseExists) {
    throw new Error(
      `four-segment mode requires a base 3-segment tag "${versionPrefix}${base}" to exist. ` +
      `No such tag found. Cannot anchor hotfix version. ` +
      `Available tags: ${stripped.slice(0, 10).join(', ')}`,
    );
  }

  // Find all 4-seg tags with the same MAJOR.MINOR.PATCH base
  const fourSegForBase = stripped
    .map(parseFourSegment)
    .filter((v): v is FourSegment => v !== null)
    .filter((v) => `${v.major}.${v.minor}.${v.patch}` === base)
    .sort((a, b) => compareFourSegment(b, a)); // descending

  if (fourSegForBase.length === 0) {
    // No existing 4-seg tags for this base — start at .1
    return `${versionPrefix}${base}.1`;
  }

  const highest = fourSegForBase[0];
  return `${versionPrefix}${highest.major}.${highest.minor}.${highest.patch}.${highest.hotfix + 1}`;
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
