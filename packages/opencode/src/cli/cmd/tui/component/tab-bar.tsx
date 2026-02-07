import { For, Show, createMemo } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useTab, type TabStatus } from "@tui/context/tab"
import { useSync } from "@tui/context/sync"
import { useTerminalDimensions } from "@opentui/solid"
import { TextAttributes, type RGBA } from "@opentui/core"
import { Session as SessionApi } from "@/session"

function statusColor(status: TabStatus, theme: { warning: RGBA; error: RGBA; info: RGBA; textMuted: RGBA }): RGBA {
  switch (status) {
    case "busy":
      return theme.warning
    case "error":
      return theme.error
    case "attention":
      return theme.info
    case "idle":
    default:
      return theme.textMuted
  }
}

export function TabBar() {
  const tab = useTab()
  const { theme } = useTheme()
  const sync = useSync()
  const dimensions = useTerminalDimensions()

  const tabLabels = createMemo(() => {
    return tab.tabs.map((t) => {
      let label = t.label
      if (t.route.type === "session") {
        const session = sync.session.get(t.route.sessionID)
        if (session && !SessionApi.isDefaultTitle(session.title)) {
          label = session.title
        }
      }
      return { ...t, displayLabel: label }
    })
  })

  const availableWidth = createMemo(() => dimensions().width)

  const truncatedTabs = createMemo(() => {
    const tabs = tabLabels()
    const width = availableWidth()
    const fixedWidth = 3 + tabs.length - 1
    const maxPerTab = Math.max(4, Math.floor((width - fixedWidth) / tabs.length))

    return tabs.map((t) => {
      let truncated = t.displayLabel
      if (truncated.length > maxPerTab - 4) {
        truncated = truncated.slice(0, Math.max(1, maxPerTab - 7)) + "..."
      }
      return { ...t, truncatedLabel: truncated }
    })
  })

  return (
    <Show when={tab.showTabBar && tab.tabs.length > 0}>
      <box
        flexDirection="row"
        width="100%"
        height={1}
        backgroundColor={theme.backgroundPanel}
        flexShrink={0}
      >
        <For each={truncatedTabs()}>
          {(t, i) => {
            const isActive = createMemo(() => t.id === tab.activeTabId)
            return (
              <>
                <Show when={i() > 0}>
                  <text fg={theme.textMuted}>│</text>
                </Show>
                <box
                  flexDirection="row"
                  paddingLeft={1}
                  paddingRight={1}
                  backgroundColor={isActive() ? theme.background : theme.backgroundPanel}
                  onMouseUp={() => tab.switchTab(t.id)}
                >
                  <text fg={statusColor(t.status, theme)}>● </text>
                  <text
                    fg={isActive() ? theme.text : theme.textMuted}
                    attributes={isActive() ? TextAttributes.BOLD : undefined}
                  >
                    {t.truncatedLabel}
                  </text>
                  <text
                    fg={theme.textMuted}
                    onMouseUp={(e: { stopPropagation?: () => void }) => {
                      e.stopPropagation?.()
                      tab.closeTab(t.id)
                    }}
                  >
                    {" "}
                    x
                  </text>
                </box>
              </>
            )
          }}
        </For>
        <box paddingLeft={1} onMouseUp={() => tab.openTab()}>
          <text fg={theme.textMuted} attributes={TextAttributes.BOLD}>
            +
          </text>
        </box>
        <box flexGrow={1} />
      </box>
    </Show>
  )
}
