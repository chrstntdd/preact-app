import { hydrate, options } from 'preact'
import 'preact/debug'

import { App } from './App'

options.debounceRendering = window.requestIdleCallback

hydrate(App, document.getElementById('root'))
