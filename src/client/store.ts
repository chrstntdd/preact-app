import { isNode } from '@chrstntdd/common'
import { rIC } from '@chrstntdd/browser'

import { createStore } from '../unistore-bindings'

import { CLIENT_SSR_HYDRATE_KEY } from '../constants'

declare global {
  interface Window {
    __INITIAL_SSR_STATE__?: any
  }
}

/**
 * Create store for both client and server contexts.
 */
const configureStore = (serverState?: any) => {
  let preloadedData

  if (!isNode()) {
    preloadedData = window[CLIENT_SSR_HYDRATE_KEY]

    try {
      if (preloadedData) {
        delete window[CLIENT_SSR_HYDRATE_KEY]

        preloadedData = JSON.parse(preloadedData)

        // Cleanup script tag...?
        rIC(() => {
          const node = document.getElementById(CLIENT_SSR_HYDRATE_KEY)
          if (node) {
            node.parentElement.removeChild(node)
          } else {
            console.log('Could not clean up the SSR state from the DOM')
          }
        })
      }
    } catch (error) {
      console.log(
        'Could not create the initial store from the server rendered state',
        error
      )
    }
  }

  const store = createStore(preloadedData || serverState)

  return store
}

export { configureStore }
