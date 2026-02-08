import { createStore, produce } from "solid-js/store"
import { createMemo } from "solid-js"
import { createSimpleContext } from "./helper"
import { useKV } from "./kv"
import { useSync } from "./sync"
import type { Route } from "./route"

export type TabStatus = "idle" | "working" | "attention" | "error" | "done"

export type Tab = {
  id: string
  route: Route
}

let tabCounter = 0
function nextTabId() {
  return `tab-${Date.now()}-${tabCounter++}`
}

export const { use: useTab, provider: TabProvider } = createSimpleContext({
  name: "Tab",
  init: () => {
    const kv = useKV()
    const sync = useSync()

    const persisted = kv.get("tabs_state", undefined) as
      | { tabs: Tab[]; activeTabId: string }
      | undefined

    const initialTab: Tab = persisted?.tabs?.[0] ?? {
      id: nextTabId(),
      route: { type: "home" },
    }

    const initialTabs = persisted?.tabs?.length ? persisted.tabs : [initialTab]
    const initialActive = persisted?.activeTabId ?? initialTab.id

    const [store, setStore] = createStore<{
      tabs: Tab[]
      activeTabId: string
    }>({
      tabs: initialTabs,
      activeTabId: initialActive,
    })

    function persist() {
      kv.set("tabs_state", {
        tabs: store.tabs.map((t) => ({ id: t.id, route: t.route })),
        activeTabId: store.activeTabId,
      })
    }

    const activeTab = createMemo(() => {
      return store.tabs.find((t) => t.id === store.activeTabId) ?? store.tabs[0]
    })

    function tabStatus(tab: Tab): TabStatus {
      if (tab.route.type !== "session") return "idle"
      const sessionID = tab.route.sessionID

      const permissions = sync.data.permission[sessionID]
      if (permissions && permissions.length > 0) return "attention"

      const questions = sync.data.question[sessionID]
      if (questions && questions.length > 0) return "attention"

      const status = sync.session.status(sessionID)
      if (status === "working" || status === "compacting") return "working"

      return "idle"
    }

    const result = {
      get tabs() {
        return store.tabs
      },
      get activeTabId() {
        return store.activeTabId
      },
      get activeTab() {
        return activeTab()
      },
      get count() {
        return store.tabs.length
      },
      status: tabStatus,
      open(route?: Route) {
        const tab: Tab = {
          id: nextTabId(),
          route: route ?? { type: "home" },
        }
        setStore(
          produce((draft) => {
            draft.tabs.push(tab)
            draft.activeTabId = tab.id
          }),
        )
        persist()
        return tab
      },
      close(tabId: string) {
        if (store.tabs.length <= 1) {
          setStore(
            produce((draft) => {
              draft.tabs[0].route = { type: "home" }
            }),
          )
          persist()
          return
        }
        const index = store.tabs.findIndex((t) => t.id === tabId)
        if (index === -1) return
        const wasActive = store.activeTabId === tabId
        setStore(
          produce((draft) => {
            draft.tabs.splice(index, 1)
            if (wasActive) {
              const next = draft.tabs[Math.min(index, draft.tabs.length - 1)]
              draft.activeTabId = next.id
            }
          }),
        )
        persist()
      },
      setActive(tabId: string) {
        if (!store.tabs.some((t) => t.id === tabId)) return
        setStore("activeTabId", tabId)
        persist()
      },
      navigate(route: Route) {
        const idx = store.tabs.findIndex((t) => t.id === store.activeTabId)
        if (idx === -1) return
        setStore("tabs", idx, "route", route)
        persist()
      },
      nextTab() {
        const idx = store.tabs.findIndex((t) => t.id === store.activeTabId)
        const next = (idx + 1) % store.tabs.length
        setStore("activeTabId", store.tabs[next].id)
        persist()
      },
      prevTab() {
        const idx = store.tabs.findIndex((t) => t.id === store.activeTabId)
        const prev = (idx - 1 + store.tabs.length) % store.tabs.length
        setStore("activeTabId", store.tabs[prev].id)
        persist()
      },
      goToTab(n: number) {
        if (n < 1 || n > store.tabs.length) return
        setStore("activeTabId", store.tabs[n - 1].id)
        persist()
      },
      tabTitle(tab: Tab): string {
        if (tab.route.type === "home") return "Home"
        const session = sync.session.get(tab.route.sessionID)
        if (!session) return "Session"
        return session.title || "Session"
      },
    }
    return result
  },
})
