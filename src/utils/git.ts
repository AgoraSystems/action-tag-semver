import * as exec from '@actions/exec';
import * as semver from 'semver';

import type { Options } from './options';
import { removePrefix } from './string';
import { computeFourSegmentVersion } from '../four-segment';

// Ensures local git tags are up-to-date
const fetchTags = async () => {
  const exitCode = await exec.exec('git', ['fetch', '--tags', '--quiet']);
  if (exitCode != 0) {
    process.exit(exitCode);
  }
};

export const getMostRecentVersion = async (options: Options) => {
  await fetchTags();

  const { exitCode, stdout } = await exec.getExecOutput('git', ['tag', '--no-column']);
  if (exitCode != 0) {
    process.exit(exitCode);
  }

  const versions = stdout
    .split('\n')
    .map((version) => removePrefix(version, options.versionPrefix))
    .map((version) => semver.parse(version))
    .filter((version): version is semver.SemVer => version !== null)
    .sort(semver.rcompare);

  return versions[0] || semver.parse('0.0.0');
};

/**
 * Returns the raw list of tags from git (prefix-stripped).
 * Used by the four-segment path to avoid semver.parse filtering.
 */
export const getRawTags = async (options: Options): Promise<string[]> => {
  await fetchTags();

  const { exitCode, stdout } = await exec.getExecOutput('git', ['tag', '--no-column']);
  if (exitCode != 0) {
    process.exit(exitCode);
  }

  return stdout
    .split('\n')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
};

/**
 * Compute the next four-segment version string (with prefix applied).
 * Reads raw tags from git and delegates to the pure four-segment module.
 */
export const getNextFourSegmentVersion = async (options: Options): Promise<string> => {
  const rawTags = await getRawTags(options);
  return computeFourSegmentVersion(rawTags, options.branchName, options.versionPrefix);
};
