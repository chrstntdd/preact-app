import { h, hydrate, options } from 'preact'
import 'preact/debug'

import { Provider, unistoreDevTools } from '../unistore-bindings'

import { App } from './App'
import { HeadProvider } from './Head'

import { configureStore } from './store'

options.debounceRendering =
  'requestIdleCallback' in window
    ? window.requestIdleCallback
    : requestAnimationFrame

const store = unistoreDevTools(configureStore())
hydrate(
  <Provider store={store}>
    <HeadProvider>
      <App />
    </HeadProvider>
  </Provider>,
  document.getElementById('root')
)
