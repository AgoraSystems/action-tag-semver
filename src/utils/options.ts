import * as core from '@actions/core';

export interface Options {
  majorLabels: string[];
  minorLabels: string[];
  versionPrefix: string;
}

export const getOptions = (): Options => {
  return {
    majorLabels: core.getInput('major-labels', { required: true }).split(','),
    minorLabels: core.getInput('minor-labels', { required: true }).split(','),
    versionPrefix: core.getInput('version-prefix', { required: true }),
  };
};
