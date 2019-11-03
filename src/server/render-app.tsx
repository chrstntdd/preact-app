import render from 'preact-render-to-string'
import { h } from 'preact'
import { Router } from 'wouter-preact'
import staticLocationHook from 'wouter-preact/static-location'

import { HeadProvider } from '../client/Head'
import { Provider } from '../unistore-bindings'

import { App } from '../client/App'
import { configureStore } from '../client/store'

const renderAppToString = (requestPath: string, { ua }) => {
  let headTags = []
  let app
  // Add ua to global state
  const store = configureStore({ ua, count: 42 })

  try {
    app = render(
      <Provider store={store}>
        <HeadProvider headTags={headTags}>
          <Router hook={staticLocationHook(requestPath)}>
            <App />
          </Router>
        </HeadProvider>
      </Provider>
    )
  } catch (error) {
    console.error('Encountered an error when rendering to a string\n', error)
    throw error
  }

  return {
    initialClientState: store.getState(),
    app,
    headTags: render(headTags as any)
  }
}

export { renderAppToString }
