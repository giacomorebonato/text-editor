import {
  createCliRenderer,
  BoxRenderable,
  TextRenderable,
  TextareaRenderable,
} from "@opentui/core"
import { resolve } from "path"

// --- CLI argument parsing ---
const filePath = process.argv[2]
if (!filePath) {
  console.error("Usage: text-editor <file-path>")
  process.exit(1)
}

const resolvedPath = resolve(filePath)
const fileName = filePath.split("/").pop() ?? filePath

// --- File I/O ---
let initialContent = ""
try {
  const file = Bun.file(resolvedPath)
  if (await file.exists()) {
    initialContent = await file.text()
  }
} catch (err) {
  console.error(`Error reading file: ${err}`)
  process.exit(1)
}

// --- Save function ---
let editor: TextareaRenderable | null = null
let renderer: Awaited<ReturnType<typeof createCliRenderer>> | null = null

async function save() {
  if (!editor) return
  const content = editor.editBuffer.getText()
  try {
    await Bun.write(resolvedPath, content)
  } catch (err) {
    // Best-effort save — nothing else we can do in a signal handler
  }
}

async function saveAndExit() {
  await save()
  renderer?.destroy()
  process.exit(0)
}

// --- Signal handlers for crash recovery ---
process.on("SIGHUP", saveAndExit)
process.on("SIGTERM", saveAndExit)

// --- Renderer setup ---
renderer = await createCliRenderer({
  exitOnCtrlC: false,
  targetFps: 30,
  useAlternateScreen: true,
})

// Root layout: vertical flex column
const root = new BoxRenderable(renderer, {
  id: "root",
  width: "100%",
  height: "100%",
  flexDirection: "column",
})
renderer.root.add(root)

// Editor textarea — fills available space
editor = new TextareaRenderable(renderer, {
  id: "editor",
  initialValue: initialContent,
  width: "100%",
  flexGrow: 1,
  wrapMode: "word",
  showCursor: true,
  cursorStyle: { style: "block", blinking: true },
  keyBindings: [
    { name: "q", ctrl: true, action: "submit" },
  ],
  onSubmit: () => {
    saveAndExit()
  },
})
root.add(editor)
editor.focus()

// Status bar — fixed 1-line height at bottom
const statusBar = new TextRenderable(renderer, {
  id: "status",
  content: `${fileName} | line 1`,
  height: 1,
  flexShrink: 0,
  width: "100%",
  fg: "#000000",
  bg: "#A5D6FF",
})
root.add(statusBar)

// Update status bar on cursor movement
renderer.setFrameCallback(async () => {
  if (editor && statusBar) {
    const cursor = editor.logicalCursor
    statusBar.content = `${fileName} | line ${cursor.row + 1}`
  }
})
