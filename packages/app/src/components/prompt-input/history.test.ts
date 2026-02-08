import { describe, expect, test } from "bun:test"
import type { Prompt } from "@/context/prompt"
import { clonePromptParts, navigatePromptHistory, prependHistoryEntry, promptLength, searchPromptHistory } from "./history"

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

  test("searchPromptHistory finds matching entry by substring", () => {
    const entries = [text("fix broken tests"), text("add new feature"), text("refactor utils")]
    const result = searchPromptHistory({ entries, query: "feat" })
    expect(result.found).toBe(true)
    if (!result.found) throw new Error("expected found")
    expect(result.index).toBe(1)
  })

  test("searchPromptHistory is case-insensitive", () => {
    const entries = [text("Fix Broken Tests"), text("Add New Feature")]
    const result = searchPromptHistory({ entries, query: "fix broken" })
    expect(result.found).toBe(true)
    if (!result.found) throw new Error("expected found")
    expect(result.index).toBe(0)
  })

  test("searchPromptHistory returns not found for empty query", () => {
    const entries = [text("hello")]
    const result = searchPromptHistory({ entries, query: "" })
    expect(result.found).toBe(false)
  })

  test("searchPromptHistory returns not found when no match", () => {
    const entries = [text("hello"), text("world")]
    const result = searchPromptHistory({ entries, query: "xyz" })
    expect(result.found).toBe(false)
  })

  test("searchPromptHistory cycles with startIndex", () => {
    const entries = [text("fix a"), text("fix b"), text("fix c")]
    const first = searchPromptHistory({ entries, query: "fix" })
    expect(first.found).toBe(true)
    if (!first.found) throw new Error("expected found")
    expect(first.index).toBe(0)

    const second = searchPromptHistory({ entries, query: "fix", startIndex: first.index + 1 })
    expect(second.found).toBe(true)
    if (!second.found) throw new Error("expected found")
    expect(second.index).toBe(1)

    const third = searchPromptHistory({ entries, query: "fix", startIndex: second.index + 1 })
    expect(third.found).toBe(true)
    if (!third.found) throw new Error("expected found")
    expect(third.index).toBe(2)

    const none = searchPromptHistory({ entries, query: "fix", startIndex: third.index + 1 })
    expect(none.found).toBe(false)
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
