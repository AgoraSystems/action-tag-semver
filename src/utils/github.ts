import * as core from '@actions/core';
import * as github from '@actions/github';

import type { Options } from './options';

export type Octokit = ReturnType<typeof github.getOctokit>;

export const getOctokit = () => {
  const token = core.getInput('github-token', { required: true });
  return github.getOctokit(token);
};

export const createTag = async (octokit: Octokit, version: string) => {
  const ref = `refs/tags/${version}`;
  await octokit.rest.git.createRef({
    ...github.context.repo,
    sha: github.context.sha,
    ref,
  });
};

export const getPullRequestLabels = async (octokit: Octokit, options: Options) => {
  const pullRequests = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
    ...github.context.repo,
    commit_sha: github.context.sha,
  });
  return pullRequests.data.flatMap((pr) => {
    const labels = pr.labels.map((label) => label.name);
    console.log(`PR #${pr.number} has labels:`);
    for (const label of labels) {
      console.log(`- ${label}`);
    }
    return labels;
  });
};
