import { createStore, produce } from "solid-js/store"
import { createSimpleContext } from "./helper"
import type { Route } from "./route"
import { useKV } from "./kv"

export type TabStatus = "idle" | "busy" | "error" | "attention"

export interface Tab {
  id: string
  route: Route
  status: TabStatus
  label: string
}

let tabCounter = 0
function nextTabId(): string {
  return `tab-${++tabCounter}`
}

export const { use: useTab, provider: TabProvider } = createSimpleContext({
  name: "Tab",
  init: () => {
    const kv = useKV()
    const showTabBarPersisted = kv.get("tab_bar_visible", false) as boolean
    const initialTab: Tab = {
      id: nextTabId(),
      route: { type: "home" },
      status: "idle",
      label: "Home",
    }

    const [store, setStore] = createStore<{
      tabs: Tab[]
      activeTabId: string
      showTabBar: boolean
    }>({
      tabs: [initialTab],
      activeTabId: initialTab.id,
      showTabBar: showTabBarPersisted,
    })

    function activeTab(): Tab {
      return store.tabs.find((t) => t.id === store.activeTabId) ?? store.tabs[0]
    }

    function openTab(route?: Route): string {
      const id = nextTabId()
      const tab: Tab = {
        id,
        route: route ?? { type: "home" },
        status: "idle",
        label: route?.type === "session" ? "Session" : "Home",
      }
      setStore(
        produce((draft) => {
          draft.tabs.push(tab)
          draft.activeTabId = id
        }),
      )
      persistTabs()
      return id
    }

    function closeTab(tabId?: string) {
      const id = tabId ?? store.activeTabId
      const idx = store.tabs.findIndex((t) => t.id === id)
      if (idx === -1) return false

      if (store.tabs.length <= 1) {
        return false
      }

      const wasActive = store.activeTabId === id
      setStore(
        produce((draft) => {
          draft.tabs.splice(idx, 1)
          if (wasActive) {
            const newIdx = Math.min(idx, draft.tabs.length - 1)
            draft.activeTabId = draft.tabs[newIdx].id
          }
        }),
      )
      persistTabs()
      return true
    }

    function switchTab(tabId: string) {
      if (store.tabs.some((t) => t.id === tabId)) {
        setStore("activeTabId", tabId)
        persistTabs()
      }
    }

    function switchToIndex(index: number) {
      if (index >= 0 && index < store.tabs.length) {
        setStore("activeTabId", store.tabs[index].id)
        persistTabs()
      }
    }

    function nextTab() {
      const idx = store.tabs.findIndex((t) => t.id === store.activeTabId)
      const next = (idx + 1) % store.tabs.length
      setStore("activeTabId", store.tabs[next].id)
      persistTabs()
    }

    function prevTab() {
      const idx = store.tabs.findIndex((t) => t.id === store.activeTabId)
      const prev = (idx - 1 + store.tabs.length) % store.tabs.length
      setStore("activeTabId", store.tabs[prev].id)
      persistTabs()
    }

    function updateTabRoute(tabId: string, route: Route) {
      const idx = store.tabs.findIndex((t) => t.id === tabId)
      if (idx === -1) return
      setStore("tabs", idx, "route", route)
      if (route.type === "session") {
        setStore("tabs", idx, "label", "Session")
      } else {
        setStore("tabs", idx, "label", "Home")
      }
      persistTabs()
    }

    function updateTabStatus(tabId: string, status: TabStatus) {
      const idx = store.tabs.findIndex((t) => t.id === tabId)
      if (idx === -1) return
      setStore("tabs", idx, "status", status)
    }

    function updateTabLabel(tabId: string, label: string) {
      const idx = store.tabs.findIndex((t) => t.id === tabId)
      if (idx === -1) return
      setStore("tabs", idx, "label", label)
    }

    function setShowTabBar(show: boolean) {
      setStore("showTabBar", show)
      kv.set("tab_bar_visible", show)
    }

    function toggleTabBar() {
      setShowTabBar(!store.showTabBar)
    }

    function findTabBySessionId(sessionID: string): Tab | undefined {
      return store.tabs.find((t) => t.route.type === "session" && t.route.sessionID === sessionID)
    }

    function persistTabs() {
      const state = store.tabs.map((t) => ({
        route: t.route,
      }))
      kv.set("tab_state", state)
    }

    function restoreTabs(sessions: string[]) {
      const saved = kv.get("tab_state") as Array<{ route: Route }> | undefined
      if (!saved || saved.length === 0) return

      const validTabs = saved.filter(
        (s) => s.route.type === "home" || (s.route.type === "session" && sessions.includes(s.route.sessionID)),
      )
      if (validTabs.length === 0) return

      const newTabs: Tab[] = validTabs.map((s) => ({
        id: nextTabId(),
        route: s.route,
        status: "idle" as TabStatus,
        label: s.route.type === "session" ? "Session" : "Home",
      }))

      setStore(
        produce((draft) => {
          draft.tabs = newTabs
          draft.activeTabId = newTabs[0].id
        }),
      )
    }

    return {
      get tabs() {
        return store.tabs
      },
      get activeTabId() {
        return store.activeTabId
      },
      get showTabBar() {
        return store.showTabBar
      },
      activeTab,
      openTab,
      closeTab,
      switchTab,
      switchToIndex,
      nextTab,
      prevTab,
      updateTabRoute,
      updateTabStatus,
      updateTabLabel,
      setShowTabBar,
      toggleTabBar,
      findTabBySessionId,
      restoreTabs,
    }
  },
})

export type TabContext = ReturnType<typeof useTab>
