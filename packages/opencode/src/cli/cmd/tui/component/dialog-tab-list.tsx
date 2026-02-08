import { useDialog } from "@tui/ui/dialog"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useTab, type TabStatus } from "@tui/context/tab"
import { createMemo } from "solid-js"
import { Locale } from "@/util/locale"
import { useKeybind } from "../context/keybind"

function statusLabel(status: TabStatus): string {
  switch (status) {
    case "working":
      return "⟳"
    case "attention":
      return "!"
    case "error":
      return "✗"
    case "done":
      return "✓"
    default:
      return ""
  }
}

export function DialogTabList() {
  const dialog = useDialog()
  const tab = useTab()
  const keybind = useKeybind()

  const options = createMemo(() => {
    return tab.tabs.map((t, i) => {
      const title = tab.tabTitle(t)
      const st = tab.status(t)
      const prefix = statusLabel(st)
      const displayTitle = prefix ? `${prefix} ${title}` : title
      return {
        title: Locale.truncate(displayTitle, 60),
        value: t.id,
        footer: `Tab ${i + 1}`,
      }
    })
  })

  return (
    <DialogSelect
      title="Tabs"
      options={options()}
      current={tab.activeTabId}
      onSelect={(option) => {
        tab.setActive(option.value)
        dialog.clear()
      }}
      keybind={[
        {
          keybind: keybind.all.tab_close?.[0],
          title: "close",
          onTrigger: async (option) => {
            tab.close(option.value)
            if (tab.count === 0) {
              dialog.clear()
            }
          },
        },
      ]}
    />
  )
}
