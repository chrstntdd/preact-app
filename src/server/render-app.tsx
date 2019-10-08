import render from 'preact-render-to-string'
import { h } from 'preact'
import { Router } from 'wouter-preact'
import staticLocationHook from 'wouter-preact/static-location'

import { App } from '../client/App'

const renderAppToString = (requestPath: string): string => {
  return render(
    <Router hook={staticLocationHook(requestPath)}>
      <App />
    </Router>
  )
}

export { renderAppToString }
