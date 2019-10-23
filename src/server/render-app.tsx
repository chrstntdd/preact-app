import render from 'preact-render-to-string'
import { h } from 'preact'
import { Router } from 'wouter-preact'
import staticLocationHook from 'wouter-preact/static-location'

import { HeadProvider } from '../client/Head'
import { App } from '../client/App'

const renderAppToString = (requestPath: string) => {
  let headTags = []
  const app = render(
    <HeadProvider headTags={headTags}>
      <Router hook={staticLocationHook(requestPath)}>
        <App />
      </Router>
    </HeadProvider>
  )

  return {
    app,
    headTags: render(headTags as any)
  }
}

export { renderAppToString }
