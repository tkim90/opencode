import { useDialog } from "@tui/ui/dialog"
import { DialogSelect } from "@tui/ui/dialog-select"
import { createMemo } from "solid-js"
import { usePromptHistory, searchHistoryReverse, type PromptInfo } from "./prompt/history"
import { Locale } from "@/util/locale"

function getHistoryPreview(input: string, maxLength: number = 60): string {
  const firstLine = input.split("\n")[0].trim()
  return Locale.truncate(firstLine, maxLength)
}

export function DialogHistorySearch(props: { onSelect: (entry: PromptInfo) => void }) {
  const dialog = useDialog()
  const history = usePromptHistory()

  const entries = createMemo(() => history.entries())

  const options = createMemo(() => {
    const all = entries()
    const indices = searchHistoryReverse(all, "")
    if (indices.length === 0 && all.length > 0) {
      return all
        .map((entry, index) => ({
          title: getHistoryPreview(entry.input),
          value: index,
          description: entry.mode === "shell" ? "shell" : undefined,
        }))
        .toReversed()
    }
    return all
      .map((entry, index) => ({
        title: getHistoryPreview(entry.input),
        value: index,
        description: entry.mode === "shell" ? "shell" : undefined,
      }))
      .toReversed()
  })

  return (
    <DialogSelect
      title="History Search"
      placeholder="(reverse-i-search)"
      options={options()}
      onSelect={(option) => {
        const all = entries()
        const entry = all[option.value]
        if (entry) {
          props.onSelect(entry)
        }
        dialog.clear()
      }}
    />
  )
}
