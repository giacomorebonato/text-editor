# QA Plan - text-editor

**Date:** 2026-03-24
**Based on:** PRD v1 (post-adversarial review), Architecture Document

## Test Strategy

### Approach

Integration tests that spawn the editor as a subprocess and validate behavior through exit codes, stderr output, and file system side effects. The editor is a TUI app — its rendering cannot be asserted programmatically, so tests focus on the observable contract: CLI validation, file I/O correctness, signal handling, and build output.

### Test Framework

- **Runner:** `bun test` (built-in Bun test runner)
- **File:** `index.test.ts`
- **Execution:** `bun test`

## Test Coverage Matrix

### CLI Argument Validation (FR15)

| Test | Input | Expected | FR/NFR |
|------|-------|----------|--------|
| No argument | `text-editor` | Exit 1, stderr: "Usage:" | FR15 |
| Directory path | `text-editor /tmp` | Exit 1, stderr: "path is a directory" | FR15 |
| Binary file | `text-editor binary.bin` | Exit 1, stderr: "not a text file" | FR15 |

### File Reading (FR1, FR2)

| Test | Input | Expected | FR/NFR |
|------|-------|----------|--------|
| Existing text file | Valid .txt file | Editor opens, exit 0 on SIGTERM | FR1 |
| Non-existent file | Path that doesn't exist | Editor opens empty, exit 0 | FR2 |
| UTF-8 with unicode | File with CJK + emoji | Editor opens, exit 0 | FR5 |

### Signal-Based Save (FR4, NFR4)

| Test | Input | Expected | FR/NFR |
|------|-------|----------|--------|
| SIGTERM on new file | Non-existent path | File created on disk | FR4, NFR4 |
| SIGTERM preserves content | Existing file | Content unchanged after save | FR4, FR5, NFR4 |
| SIGHUP triggers save | Existing file | Content preserved | FR4, NFR4 |

### Atomic Write Safety (NFR4)

| Test | Input | Expected | FR/NFR |
|------|-------|----------|--------|
| No temp file after save | Any file | `.tmp` file does not exist after exit | NFR4 |

### File Path Handling

| Test | Input | Expected | FR/NFR |
|------|-------|----------|--------|
| Path with spaces | `"file with spaces.txt"` | Opens correctly | FR1 |
| Unicode path | `"文件.txt"` | Opens correctly | FR1 |

### Build (FR16)

| Test | Input | Expected | FR/NFR |
|------|-------|----------|--------|
| Compile succeeds | `bun build --compile` | Binary created, size > 0 | FR16 |
| Binary runs | Compiled binary, no args | Exit 1, stderr: "Usage:" | FR16 |

## What Is NOT Tested (and Why)

- **TUI rendering** — Cannot assert terminal ANSI output reliably in CI. Visual correctness is verified manually.
- **Ctrl+Q save-and-quit** — Requires sending keystrokes to a TUI; not feasible in subprocess testing. Covered by manual testing.
- **Status bar content** — Same as above; frame callback output is not capturable.
- **Write failure recovery** — Would require simulating disk-full or permission-revoked during save, which is fragile and platform-specific.
- **Large file performance (NFR2, NFR3)** — Performance benchmarks are environment-dependent and not suitable for automated tests.

## Manual Testing Checklist

For release verification, manually confirm:

- [ ] Open existing file → content displayed correctly
- [ ] Edit text → insert, delete, backspace, arrow key navigation work
- [ ] Status bar shows `filename | line N` and updates on cursor move
- [ ] Ctrl+Q saves file and exits cleanly
- [ ] Terminal is restored after exit (no garbled output)
- [ ] Word wrapping works on long lines
- [ ] Close terminal window → file is saved (SIGHUP)

## Running Tests

```bash
bun test
```

Expected: all tests pass. Build tests may take up to 30 seconds due to compilation.
