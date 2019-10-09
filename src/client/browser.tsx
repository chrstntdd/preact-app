import { h, hydrate, options } from 'preact'

import { App } from './App'

options.debounceRendering = window.requestIdleCallback

hydrate(<App />, document.getElementById('root'))
