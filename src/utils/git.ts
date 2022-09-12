import * as exec from '@actions/exec';
import * as semver from 'semver';

import type { Options } from './options';
import { removePrefix } from './string';

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

export const createTag = async (version: string) => {
  const exitCode = await exec.exec('git', ['tag', version]);
  if (exitCode != 0) {
    process.exit(exitCode);
  }
};

export const pushTags = async () => {
  const exitCode = await exec.exec('git', ['push', '--tags']);
  if (exitCode != 0) {
    process.exit(exitCode);
  }
};
