# From a compatibility report to a traceable release

A layout fix needs a chain a maintainer can explain: the reported failure, the behavior reproduced, the smallest correction, and the exact artifact eventually released. Wider Gemini already has an example in its history: the [changelog](../../CHANGELOG.md) records `2.6.0-rc.1` on September 8, 2026, followed by `2.6.0` on September 15, and credits [PR #10](https://github.com/Planetes1mal/wider-gemini/pull/10) for Gemini layout compatibility improvements. The candidate explicitly requested feedback from affected macOS users. Those entries alone do not prove that every macOS flow was verified.

The original discussion preserves an important failed step: the maintainer [could not reproduce the issue on Windows](https://github.com/Planetes1mal/wider-gemini/issues/9#issuecomment-5578079343), and after the candidate was offered, the reporter [said it still failed](https://github.com/Planetes1mal/wider-gemini/issues/9#issuecomment-5595355338). That reporter subsequently contributed [PR #10](https://github.com/Planetes1mal/wider-gemini/pull/10), merged on September 15 at 17:03:44 UTC; the [stable GitHub release](https://github.com/Planetes1mal/wider-gemini/releases/tag/v2.6.0) followed at 17:11:04 UTC. The checked issue/PR discussion contains no positive stable-version user confirmation or independent fix-validation timestamp. The Chrome Web Store publication time is also unknown. Neither the merge nor the later issue closure substitutes for those missing observations.

## Capture the failure before expanding the fix

The [bug-report form](../../.github/ISSUE_TEMPLATE/bug-report.yml) asks for a reproduction and environment. The popup's local help page can preview version/platform/layout diagnostics that the user chooses to copy. It excludes conversation text, page URLs, and custom preset names. A useful report also identifies the page type, the expected result, and whether a reload changes the behavior.

Reproduce with non-sensitive content. For width failures, preserve the smallest relevant structure: outer conversation, constrained inner wrapper, and any affected table/input/overlay. A focused browser fixture can then capture the geometry. If the problem exists only on a particular device or Gemini rollout, retain that limitation and ask the reporter to verify the candidate; synthetic success is not a substitute.

## Keep the candidate identifiable

The repository's candidate convention uses a target numeric version and a human-readable candidate suffix:

```json
{
    "version": "2.6.0",
    "version_name": "2.6.0-rc.1"
}
```

The tag is `v2.6.0-rc.1`, and the dated changelog heading names that exact candidate. Later candidates increment the suffix. Stable removes `version_name`, retains the target numeric version, and uses the stable tag and its own changelog section. Chrome's version ordering uses the numeric `version`; a candidate suffix is not an automatic candidate-to-stable update mechanism. Candidate users replace/reload the unpacked extension manually.

The shared [packager](../../scripts/package.ps1) checks these relationships before writing an archive. Its release-note expression matches a complete dated heading: a stable heading cannot accidentally select an RC section, and `rc.1` cannot select `rc.10`. An explicit file allowlist keeps research, recordings, private diagnostics, and development fixtures outside the extension package. The [existing packaging checks](../../tests/release-package.test.js) exercise both successful and rejected inputs.

## Separate internal verification from distribution

During internal work, load the source directory and run only the checks relevant to the change. `node scripts/test.js --skip-packaging` runs the non-packaging unit suite; the existing browser scripts accept the source tree or synthetic fixtures directly. There is no need to rebuild a ZIP for every wording or popup adjustment.

Before an actual release, run the full documented suite, verify the affected live flows, record remaining device limitations, and update the release notes. The [release workflow](../../.github/workflows/release.yml) waits for the reusable test workflow before calling the same packager used locally. Candidate releases are prereleases and are not marked latest. Only a stable release is eligible for the manual Chrome Web Store upload.

The current working changes remain internal and uncommitted. This article describes the existing process; it does not record a new tag, successful hosted CI run, store upload, or macOS sign-off. See the [compatibility record](../compatibility.md) for current evidence and the [measurement notes](../measurement.md) for recording repair time, reproducibility, recurrence, and outside contributions without inventing historical values.
