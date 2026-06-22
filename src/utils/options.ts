import * as core from '@actions/core';

export type VersionScheme = 'semver' | 'four-segment';

export interface Options {
  majorLabels: string[];
  minorLabels: string[];
  versionPrefix: string;
  versionScheme: VersionScheme;
  branchName: string;
}

export const getOptions = (): Options => {
  const rawScheme = core.getInput('version-scheme') || 'semver';
  if (rawScheme !== 'semver' && rawScheme !== 'four-segment') {
    throw new Error(`Invalid version-scheme "${rawScheme}". Must be "semver" or "four-segment".`);
  }

  return {
    majorLabels: core.getInput('major-labels', { required: true }).split(','),
    minorLabels: core.getInput('minor-labels', { required: true }).split(','),
    versionPrefix: core.getInput('version-prefix', { required: true }),
    versionScheme: rawScheme as VersionScheme,
    branchName: core.getInput('branch-name') || '',
  };
};
