import { h, FunctionComponent } from 'preact'
import { useEffect, useState, useRef, useContext } from 'preact/hooks'
import { createPortal } from 'preact/compat'

import { invariant } from '@chrstntdd/common'

import { HeadContext } from './ctx'

type HeadTags =
  | 'title'
  | 'base'
  | 'link'
  | 'style'
  | 'meta'
  | 'script'
  | 'noscript'
  | 'template'

type Props = {
  as: HeadTags
  name?: string
  property?: string
}

const HeadTag: FunctionComponent<Props> = ({
  as: As,
  name,
  property,
  ...rest
}) => {
  const [canUseDOM, setCanUseDOM] = useState(false)
  const headTags = useContext(HeadContext)
  const indexRef = useRef(-1)
  invariant(headTags, '<HeadProvider /> should be in the tree')

  useEffect(() => {
    setCanUseDOM(true)

    indexRef.current = headTags.addClientTag(As, name || property)

    return () => {
      headTags.removeClientTag(As, indexRef.current)
    }
  }, [])

  const derivedProps = { ...rest, property, name }

  if (canUseDOM) {
    if (!headTags.shouldRenderTag(As, indexRef.current)) return null

    const ClientComp = h(As, derivedProps)
    return createPortal(ClientComp, document.head)
  }

  const ServerComp = h(As, { ...derivedProps, ['data-rh']: '' })
  headTags.addServerTag(ServerComp)
  return null
}

type PropsWithoutAs = Omit<Props, 'as'>

const HeadTitle: FunctionComponent<PropsWithoutAs> = props => (
  <HeadTag as="title" {...props} />
)

const HeadStyle: FunctionComponent<PropsWithoutAs> = props => (
  <HeadTag as="style" {...props} />
)

const HeadMeta: FunctionComponent<PropsWithoutAs> = props => (
  <HeadTag as="meta" {...props} />
)

const HeadLink: FunctionComponent<PropsWithoutAs> = props => (
  <HeadTag as="link" {...props} />
)

export { HeadTag, HeadTitle, HeadStyle, HeadMeta, HeadLink }
