import { createStore } from "solid-js/store"
import { createContext, useContext, type ParentProps } from "solid-js"
import type { PromptInfo } from "../component/prompt/history"

export type HomeRoute = {
  type: "home"
  initialPrompt?: PromptInfo
}

export type SessionRoute = {
  type: "session"
  sessionID: string
  initialPrompt?: PromptInfo
}

export type Route = HomeRoute | SessionRoute

type RouteContextValue = {
  readonly data: Route
  navigate(route: Route): void
}

const RouteCtx = createContext<RouteContextValue>()

export function RouteProvider(
  props: ParentProps & { tabNavigate?: (route: Route) => void; tabRoute?: Route },
) {
  const [store, setStore] = createStore<Route>(
    process.env["OPENCODE_ROUTE"]
      ? JSON.parse(process.env["OPENCODE_ROUTE"])
      : {
          type: "home",
        },
  )

  const value: RouteContextValue = {
    get data() {
      if (props.tabRoute) return props.tabRoute
      return store
    },
    navigate(route: Route) {
      if (props.tabNavigate) {
        props.tabNavigate(route)
      } else {
        console.log("navigate", route)
        setStore(route)
      }
    },
  }

  return <RouteCtx.Provider value={value}>{props.children}</RouteCtx.Provider>
}

export function useRoute(): RouteContextValue {
  const value = useContext(RouteCtx)
  if (!value) throw new Error("Route context must be used within a RouteProvider")
  return value
}

export type RouteContext = ReturnType<typeof useRoute>

export function useRouteData<T extends Route["type"]>(type: T) {
  const route = useRoute()
  return route.data as Extract<Route, { type: typeof type }>
}
