import { For, Show, createMemo, createSignal } from "solid-js"
import { useTab, type Tab, type TabStatus } from "@tui/context/tab"
import { useTheme } from "@tui/context/theme"
import { useTerminalDimensions } from "@opentui/solid"
import { Locale } from "@/util/locale"

function statusIndicator(status: TabStatus): { char: string; colorKey: "success" | "warning" | "error" | "textMuted" } {
  switch (status) {
    case "working":
      return { char: "●", colorKey: "warning" }
    case "attention":
      return { char: "●", colorKey: "error" }
    case "error":
      return { char: "●", colorKey: "error" }
    case "done":
      return { char: "●", colorKey: "success" }
    default:
      return { char: "○", colorKey: "textMuted" }
  }
}

export function TabBar() {
  const tab = useTab()
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const [hoverTab, setHoverTab] = createSignal<string | null>(null)
  const [hoverNew, setHoverNew] = createSignal(false)

  const availableWidth = createMemo(() => {
    const w = dimensions().width
    return Math.max(w - 4, 20)
  })

  const maxTitleLen = createMemo(() => {
    const count = tab.count
    const reserved = 5
    const perTab = Math.floor((availableWidth() - reserved) / Math.max(count, 1))
    return Math.max(perTab - 5, 4)
  })

  function truncTitle(t: Tab) {
    const title = tab.tabTitle(t)
    return Locale.truncate(title, maxTitleLen())
  }

  return (
    <box flexShrink={0} flexDirection="row" height={1} backgroundColor={theme.backgroundPanel}>
      <For each={tab.tabs}>
        {(t, i) => {
          const isActive = createMemo(() => t.id === tab.activeTabId)
          const isHover = createMemo(() => hoverTab() === t.id)
          const st = createMemo(() => tab.status(t))
          const ind = createMemo(() => statusIndicator(st()))
          return (
            <box
              flexDirection="row"
              flexShrink={1}
              onMouseUp={() => tab.setActive(t.id)}
              onMouseOver={() => setHoverTab(t.id)}
              onMouseOut={() => setHoverTab(null)}
              backgroundColor={isActive() ? theme.background : isHover() ? theme.backgroundElement : theme.backgroundPanel}
              paddingLeft={1}
              paddingRight={1}
            >
              <text fg={theme[ind().colorKey]}>{ind().char}</text>
              <text fg={isActive() ? theme.text : theme.textMuted}>
                {" "}
                {truncTitle(t)}
              </text>
              <Show when={i() < tab.count - 1}>
                <text fg={theme.border}> │</text>
              </Show>
            </box>
          )
        }}
      </For>
      <box
        flexShrink={0}
        paddingLeft={1}
        onMouseUp={() => tab.open()}
        onMouseOver={() => setHoverNew(true)}
        onMouseOut={() => setHoverNew(false)}
        backgroundColor={hoverNew() ? theme.backgroundElement : theme.backgroundPanel}
      >
        <text fg={theme.textMuted}>+</text>
      </box>
      <box flexGrow={1} backgroundColor={theme.backgroundPanel} />
    </box>
  )
}
