# Tag SemVer

This GitHub Action determine's the next semantic version based on PR labels and existing git tags,
then creates a new git tag with that version as the name.

This action is designed to be used in a workflow triggered by a pull request being merged. If a pull
request is not found for the commit that triggered the workflow, the action will always create a
new patch version.

## Action Inputs

- **github-token** (required): Usually `${{ secrets.GITHUB_TOKEN }}`, but you can use any token you like here.
- **major-labels** (required): Comma-separated list of labels that will cause a major version bump.
- **minor-labels** (required): Comma-separated list of labels that will cause a minor version bump.
- **version-prefix** (optional): Prefix to prepend to version numbers.

Note that if no labels in the pull request match `major-labels` or `minor-labels`, then this action
will default to creating a new patch version.

## Action Outputs
- **version**: The newly created version number.

## Example

```yml
name: Create SemVer Tag

on:
  push:
    branches: ["main"]

jobs:
  bump:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Create new version and tag
        id: create-version
        uses: AgoraSystems/action-tag-semver@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          major-labels: "major,breaking"
          minor-labels: "minor,schema-change"
          version-prefix: "v"
```
