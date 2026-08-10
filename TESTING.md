# Invitation-only preview testing

This document is for invited operational testers. The repository is public, but this experimental preview is unannounced and hands-on testing is invitation-only. Do not forward the invitation, recruit additional testers, or publicly announce the preview.

## Safety contract

The preview is an analyzer, not a migration executor. It must:

- inspect the selected target without editing source, configuration, dependencies, or Git state;
- print one detailed guidance string per supported detection only in the terminal; and
- avoid reports, dashboards, telemetry, caches in the target, and other persistent analyzer artifacts.

Rules cover only explicitly supported patterns. Missing detections and guidance that requires human judgment are expected preview risks. Review every message against the code and the applicable Solid migration documentation before making changes yourself.

Use a non-sensitive project that you are authorized to test. Start from a clean Git working tree, keep an independent backup, and never include secrets or proprietary code in feedback.

## Run the analyzer

From this repository's root, install the pinned dependencies and run:

```sh
pnpm install --frozen-lockfile
pnpm analyze --target /absolute/path/to/your/project
```

Before and after the run, check the target repository:

```sh
git -C /absolute/path/to/your/project status --short
```

The output must be identical. Also check for unexpected new files. If the analyzer changes the target or creates a persistent artifact, stop using it and open a public issue.

## What to evaluate

For each terminal message, check:

1. whether the cited source location is correct;
2. whether the identified Solid migration applies;
3. whether the guidance explains a safe next step and its stop conditions; and
4. whether another supported-looking site was missed.

A successful run can contain detections and is not a claim of complete migration coverage.

## Report feedback

Open an ordinary [public GitHub issue](https://github.com/devagrawal09/solid-codemod/issues/new). State whether it concerns a false positive, missed migration, guidance quality, or analyzer failure. Search for duplicates first.

Everything submitted is public. Provide the analyzer commit, a minimal sanitized code sample, the exact command with sensitive paths replaced, and only the relevant terminal text. Do not attach a repository, archive, generated analyzer output, or project backup.
