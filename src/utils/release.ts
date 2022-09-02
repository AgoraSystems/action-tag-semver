import type { Options } from './options';
import type { Octokit } from './github';
import { getPullRequestLabels } from './github';

const getReleaseTypeFromLabels = (labels: string[], options: Options) => {
  const matches = labels.map((label) => {
    if (options.majorLabels.includes(label)) {
      return 'major';
    }
    if (options.minorLabels.includes(label)) {
      return 'minor';
    }
    return 'patch';
  });

  if (matches.includes('major')) {
    return 'major';
  }
  if (matches.includes('minor')) {
    return 'minor';
  }
  return 'patch';
};

export const getReleaseType = async (octokit: Octokit, options: Options) => {
  const labels = await getPullRequestLabels(octokit, options);
  return getReleaseTypeFromLabels(labels, options);
};
