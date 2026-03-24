import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { resolve, join } from "path"
import { mkdir, rm, chmod, writeFile } from "node:fs/promises"

const EDITOR = resolve("index.ts")
const TMP_DIR = resolve(".test-tmp")

/** Run the editor as a subprocess, return exit code + stderr */
async function runEditor(
  args: string[],
  options?: { timeout?: number; signal?: NodeJS.Signals }
): Promise<{ exitCode: number; stderr: string; stdout: string }> {
  const proc = Bun.spawn(["bun", "run", EDITOR, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, TERM: "dumb" },
  })

  if (options?.timeout) {
    setTimeout(() => {
      if (options.signal) {
        proc.kill(options.signal)
      } else {
        proc.kill("SIGTERM")
      }
    }, options.timeout)
  }

  const exitCode = await proc.exited
  const stderr = await new Response(proc.stderr).text()
  const stdout = await new Response(proc.stdout).text()
  return { exitCode, stderr, stdout }
}

beforeEach(async () => {
  await mkdir(TMP_DIR, { recursive: true })
})

afterEach(async () => {
  await rm(TMP_DIR, { recursive: true, force: true })
})

// --- CLI Argument Validation (FR15) ---

describe("CLI argument validation", () => {
  test("exits with error when no file path provided", async () => {
    const { exitCode, stderr } = await runEditor([])
    expect(exitCode).toBe(1)
    expect(stderr).toContain("Usage: text-editor <file-path>")
  })

  test("exits with error when path is a directory", async () => {
    const dirPath = join(TMP_DIR, "a-directory")
    await mkdir(dirPath)
    const { exitCode, stderr } = await runEditor([dirPath])
    expect(exitCode).toBe(1)
    expect(stderr).toContain("path is a directory")
  })

  test("exits with error for binary (non-UTF-8) file", async () => {
    const binPath = join(TMP_DIR, "binary.bin")
    await Bun.write(binPath, new Uint8Array([0x80, 0x81, 0x82, 0xff]))
    const { exitCode, stderr } = await runEditor([binPath])
    expect(exitCode).toBe(1)
    expect(stderr).toContain("not a text file")
  })
})

// --- File Read (FR1, FR2) ---

describe("file reading", () => {
  test("opens existing text file without error", async () => {
    const filePath = join(TMP_DIR, "existing.txt")
    await Bun.write(filePath, "Hello, world!\n")
    const { exitCode } = await runEditor([filePath], { timeout: 1500 })
    expect(exitCode).toBe(0) // killed by SIGTERM → exit 0 via signal handler
  })

  test("opens non-existent file path without error (upsert model)", async () => {
    const filePath = join(TMP_DIR, "new-file.txt")
    const { exitCode } = await runEditor([filePath], { timeout: 1500 })
    expect(exitCode).toBe(0)
  })

  test("handles UTF-8 content with unicode characters", async () => {
    const filePath = join(TMP_DIR, "unicode.txt")
    await Bun.write(filePath, "日本語テスト 🎉 café résumé\n")
    const { exitCode } = await runEditor([filePath], { timeout: 1500 })
    expect(exitCode).toBe(0)
  })
})

// --- Signal Handling / Save (FR4, NFR4) ---

describe("signal-based save", () => {
  test("SIGTERM triggers save and creates file for new files", async () => {
    const filePath = join(TMP_DIR, "signal-new.txt")
    const proc = Bun.spawn(["bun", "run", EDITOR, filePath], {
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, TERM: "dumb" },
    })
    // Wait for editor to initialize
    await Bun.sleep(1500)
    proc.kill("SIGTERM")
    await proc.exited

    // New file with no edits — file should be created (empty content from textarea)
    const file = Bun.file(filePath)
    expect(await file.exists()).toBe(true)
  })

  test("SIGTERM preserves existing file content", async () => {
    const filePath = join(TMP_DIR, "signal-existing.txt")
    const original = "Original content\nLine two\n"
    await Bun.write(filePath, original)

    const proc = Bun.spawn(["bun", "run", EDITOR, filePath], {
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, TERM: "dumb" },
    })
    await Bun.sleep(1500)
    proc.kill("SIGTERM")
    await proc.exited

    const saved = await Bun.file(filePath).text()
    expect(saved).toBe(original)
  })

  test("SIGHUP triggers save", async () => {
    const filePath = join(TMP_DIR, "sighup-test.txt")
    const content = "SIGHUP test content\n"
    await Bun.write(filePath, content)

    const proc = Bun.spawn(["bun", "run", EDITOR, filePath], {
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, TERM: "dumb" },
    })
    await Bun.sleep(1500)
    proc.kill("SIGHUP")
    await proc.exited

    const saved = await Bun.file(filePath).text()
    expect(saved).toBe(content)
  })
})

// --- Atomic Write Safety (NFR4) ---

describe("atomic write safety", () => {
  test("no temp file left behind after successful save", async () => {
    const filePath = join(TMP_DIR, "clean-save.txt")
    await Bun.write(filePath, "test\n")

    const proc = Bun.spawn(["bun", "run", EDITOR, filePath], {
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, TERM: "dumb" },
    })
    await Bun.sleep(1500)
    proc.kill("SIGTERM")
    await proc.exited

    const tmpFile = Bun.file(filePath + ".tmp")
    expect(await tmpFile.exists()).toBe(false)
  })
})

// --- File Path Handling ---

describe("file path handling", () => {
  test("handles file paths with spaces", async () => {
    const filePath = join(TMP_DIR, "file with spaces.txt")
    await Bun.write(filePath, "spaces work\n")
    const { exitCode } = await runEditor([filePath], { timeout: 1500 })
    expect(exitCode).toBe(0)
  })

  test("handles file paths with unicode characters", async () => {
    const filePath = join(TMP_DIR, "文件.txt")
    await Bun.write(filePath, "unicode path\n")
    const { exitCode } = await runEditor([filePath], { timeout: 1500 })
    expect(exitCode).toBe(0)
  })
})

// --- Build (FR16) ---

describe("binary build", () => {
  test("bun build --compile succeeds", async () => {
    const outPath = join(TMP_DIR, "text-editor-test")
    const proc = Bun.spawn(
      ["bun", "build", "--compile", EDITOR, "--outfile", outPath],
      { stdout: "pipe", stderr: "pipe" }
    )
    const exitCode = await proc.exited
    expect(exitCode).toBe(0)

    const file = Bun.file(outPath)
    expect(await file.exists()).toBe(true)
    expect(file.size).toBeGreaterThan(0)
  }, 30000)

  test("compiled binary shows usage on missing args", async () => {
    const outPath = join(TMP_DIR, "text-editor-test")
    // Build first
    const build = Bun.spawn(
      ["bun", "build", "--compile", EDITOR, "--outfile", outPath],
      { stdout: "pipe", stderr: "pipe" }
    )
    await build.exited

    // Run without args
    const proc = Bun.spawn([outPath], { stdout: "pipe", stderr: "pipe" })
    const exitCode = await proc.exited
    const stderr = await new Response(proc.stderr).text()
    expect(exitCode).toBe(1)
    expect(stderr).toContain("Usage: text-editor")
  }, 30000)
})
