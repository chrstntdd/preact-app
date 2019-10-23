import { h, hydrate, options } from 'preact'
import 'preact/debug'

import { App } from './App'
import { HeadProvider } from './Head'

options.debounceRendering = window.requestIdleCallback

hydrate(
  <HeadProvider>
    <App />
  </HeadProvider>,
  document.getElementById('root')
)
