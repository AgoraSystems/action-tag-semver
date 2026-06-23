import * as core from '@actions/core';
import * as semver from 'semver';

import { getMostRecentVersion, getNextFourSegmentVersion } from './utils/git';
import { createTag, getOctokit } from './utils/github';
import { getOptions } from './utils/options';
import { getReleaseType } from './utils/release';

const main = async () => {
  // Initialize options and Octokit
  const options = getOptions();
  const octokit = getOctokit();

  if (options.versionScheme === 'four-segment') {
    const newVersionString = await getNextFourSegmentVersion(options);
    console.log('Version scheme: four-segment');
    console.log('Branch:', options.branchName);
    console.log('New computed version:', newVersionString);

    await createTag(octokit, newVersionString);
    core.setOutput('version', newVersionString);
    return;
  }

  // --- Existing semver path (unchanged) ---
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

  const newVersionString = options.versionPrefix + newVersion;
  await createTag(octokit, newVersionString);
  core.setOutput('version', newVersionString);
};

main().catch((error: Error) => {
  console.error(error);
  core.setFailed(error);
});
