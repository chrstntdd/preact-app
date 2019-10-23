import { VNode } from 'preact'
import { createContext } from 'preact/compat'

type HeadContextValue = {
  addClientTag: (tag: string, name?: string) => any
  shouldRenderTag: (tag: string, index: number) => boolean
  removeClientTag: (tag: string, index: number) => void
  addServerTag: (tagNode: VNode) => void
}

const HeadContext = createContext<HeadContextValue>(
  (void 0 as any) as HeadContextValue
)

export { HeadContext, HeadContextValue }
