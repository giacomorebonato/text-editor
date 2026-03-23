# PRD Adversarial Review Findings

**Reviewed:** `_bmad-output/prd.md`
**Date:** 2026-03-23

## Findings

1. **FR3 and FR14 are duplicates.** Both describe Ctrl+Q save-and-quit from different angles. One should be merged or removed.

2. **NFR1–NFR3 are unmeasurable.** "Feel instant," "smooth," and "no visible lag" are subjective and cannot be validated. Needs thresholds (e.g., <50ms keystroke latency).

3. **No definition of what "text file" means.** No spec for binary files, symlinks, directories, permission errors, or special characters in paths.

4. **SIGTERM save is an optimistic assumption.** `kill -9` bypasses signal handlers entirely. The PRD creates a false sense of reliability by not acknowledging uncatchable signals.

5. **"~200 lines" is a vague measurable outcome.** The tilde makes this unverifiable as a success criterion.

6. **No file size upper bound.** NFR2 covers files under 10,000 lines but says nothing about behavior above that threshold.

7. **macOS-only scope is implicit, not explicit.** Platform constraint is buried in one bullet point rather than stated as an explicit constraint.

8. **"Upsert model" is jargon without a defined contract.** No spec for parent directory creation, file creation timing (on open vs. on save), or file permissions.

9. **No encoding specification.** "Faithful" serialization is meaningless without specifying the read-side encoding contract (UTF-8? System default? BOM handling?).

10. **Risk mitigation for the core bet has no fallback plan.** "Pivot to custom rendering" is stated without any detail on what that entails.

11. **Ctrl+Q conflicts with terminal flow control.** Ctrl+Q is XON — if flow control is enabled, the terminal driver consumes it before it reaches the app.

12. **Journey 2 assumes SIGHUP fires on terminal close.** This is terminal-emulator-dependent behavior, not guaranteed — especially on macOS.
