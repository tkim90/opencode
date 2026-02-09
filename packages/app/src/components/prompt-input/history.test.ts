import { describe, expect, test } from "bun:test"
import type { Prompt } from "@/context/prompt"
import { clonePromptParts, navigatePromptHistory, prependHistoryEntry, promptLength, searchPromptHistory, promptText } from "./history"

const DEFAULT_PROMPT: Prompt = [{ type: "text", content: "", start: 0, end: 0 }]

const text = (value: string): Prompt => [{ type: "text", content: value, start: 0, end: value.length }]

describe("prompt-input history", () => {
  test("prependHistoryEntry skips empty prompt and deduplicates consecutive entries", () => {
    const first = prependHistoryEntry([], DEFAULT_PROMPT)
    expect(first).toEqual([])

    const withOne = prependHistoryEntry([], text("hello"))
    expect(withOne).toHaveLength(1)

    const deduped = prependHistoryEntry(withOne, text("hello"))
    expect(deduped).toBe(withOne)
  })

  test("navigatePromptHistory restores saved prompt when moving down from newest", () => {
    const entries = [text("third"), text("second"), text("first")]
    const up = navigatePromptHistory({
      direction: "up",
      entries,
      historyIndex: -1,
      currentPrompt: text("draft"),
      savedPrompt: null,
    })
    expect(up.handled).toBe(true)
    if (!up.handled) throw new Error("expected handled")
    expect(up.historyIndex).toBe(0)
    expect(up.cursor).toBe("start")

    const down = navigatePromptHistory({
      direction: "down",
      entries,
      historyIndex: up.historyIndex,
      currentPrompt: text("ignored"),
      savedPrompt: up.savedPrompt,
    })
    expect(down.handled).toBe(true)
    if (!down.handled) throw new Error("expected handled")
    expect(down.historyIndex).toBe(-1)
    expect(down.prompt[0]?.type === "text" ? down.prompt[0].content : "").toBe("draft")
  })

  test("searchPromptHistory returns matching indices case-insensitively", () => {
    const entries = [text("Fix broken tests"), text("Add unit tests"), text("Deploy to production"), text("fix lint errors")]
    const matches = searchPromptHistory(entries, "fix")
    expect(matches).toEqual([0, 3])
  })

  test("searchPromptHistory returns empty for no matches", () => {
    const entries = [text("hello"), text("world")]
    expect(searchPromptHistory(entries, "xyz")).toEqual([])
  })

  test("searchPromptHistory returns empty for empty query", () => {
    const entries = [text("hello")]
    expect(searchPromptHistory(entries, "")).toEqual([])
  })

  test("promptText extracts text content from prompt parts", () => {
    const prompt = [text("hello ")[0], { type: "file" as const, path: "a.ts", content: "@a.ts", start: 6, end: 11 }, { type: "text" as const, content: " world", start: 11, end: 17 }]
    expect(promptText(prompt)).toBe("hello @a.ts world")
  })

  test("helpers clone prompt and count text content length", () => {
    const original: Prompt = [
      { type: "text", content: "one", start: 0, end: 3 },
      {
        type: "file",
        path: "src/a.ts",
        content: "@src/a.ts",
        start: 3,
        end: 12,
        selection: { startLine: 1, startChar: 1, endLine: 2, endChar: 1 },
      },
      { type: "image", id: "1", filename: "img.png", mime: "image/png", dataUrl: "data:image/png;base64,abc" },
    ]
    const copy = clonePromptParts(original)
    expect(copy).not.toBe(original)
    expect(promptLength(copy)).toBe(12)
    if (copy[1]?.type !== "file") throw new Error("expected file")
    copy[1].selection!.startLine = 9
    if (original[1]?.type !== "file") throw new Error("expected file")
    expect(original[1].selection?.startLine).toBe(1)
  })
})
