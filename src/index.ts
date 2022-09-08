import * as core from '@actions/core';
import * as semver from 'semver';

import { getMostRecentVersion } from './utils/git';
import { createTag, getOctokit } from './utils/github';
import { getOptions } from './utils/options';
import { getReleaseType } from './utils/release';

const main = async () => {
  // Initialize options and Octokit
  const options = getOptions();
  const octokit = getOctokit();

  // Determine the version for the next release
  const [mostRecentVersion, releaseType] = await Promise.all([
    getMostRecentVersion(options),
    getReleaseType(octokit, options),
  ]);
  const newVersion = semver.inc(mostRecentVersion, releaseType);
  if (!newVersion) {
    throw new Error('Failed to increment version');
  }
  console.log('Most recent version tag on `main`:', mostRecentVersion.version);
  console.log('Release type:', releaseType);
  console.log('New computed version:', newVersion);

  // Create a tag with the new release
  await createTag(octokit, options.versionPrefix + newVersion);
};

main().catch((error: Error) => {
  console.error(error);
  core.setFailed(error);
});
