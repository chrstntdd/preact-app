import { h, Component } from 'preact'
import { invariant } from '@chrstntdd/common'

import { HeadContext, HeadContextValue } from './ctx'

const cascadingTags = ['title', 'meta']

type Props = {
  headTags?: any[]
}

type State = HeadContextValue & Record<string, any>

class HeadProvider extends Component<Props, State> {
  indices = new Map()

  state: State = {
    addClientTag: (tag, name) => {
      // consider only cascading tags
      if (cascadingTags.includes(tag)) {
        this.setState(prevState => {
          const names = prevState[tag] || []
          return {
            [tag]: [...names, name]
          }
        })
        // track indices synchronously
        const { indices } = this
        const index = indices.has(tag) ? indices.get(tag) + 1 : 0
        indices.set(tag, index)
        return index
      }
      return -1
    },

    shouldRenderTag: (tag, index) => {
      if (cascadingTags.includes(tag)) {
        const names = this.state[tag]
        // check if the tag is the last one of similar
        return names && names.lastIndexOf(names[index]) === index
      }
      return true
    },

    removeClientTag: (tag, index) => {
      this.setState(prevState => {
        const names = prevState[tag]

        if (names) {
          names[index] = null

          return {
            [tag]: names
          }
        }

        return null
      })
    },

    addServerTag: tagNode => {
      const { headTags = [] } = this.props
      // tweak only cascading tags
      if (cascadingTags.includes(tagNode.type as string)) {
        const index = headTags.findIndex(prev => {
          const prevName = prev.props.name || prev.props.property,
            nextName = tagNode.props.name || tagNode.props.property

          return prev.type === tagNode.type && prevName === nextName
        })

        index !== -1 && headTags.splice(index, 1)
      }

      headTags.push(tagNode)
    }
  }

  componentDidMount() {
    for (let ssrTag of document.head.querySelectorAll<HTMLElement>(
      `[data-rh=""]`
    )) {
      ssrTag.parentNode.removeChild(ssrTag)
    }
  }

  render({ headTags, children }) {
    invariant(
      typeof window !== 'undefined' || Array.isArray(headTags),
      'headTags array should be passed to <HeadProvider /> in node'
    )
    return (
      <HeadContext.Provider value={this.state}>{children}</HeadContext.Provider>
    )
  }
}

export { HeadProvider }
