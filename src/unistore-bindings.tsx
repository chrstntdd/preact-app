import { h } from 'preact'
import { useContext, useEffect, useReducer } from 'preact/hooks'
import { createContext } from 'preact/compat'

/** Modern fork of unistore with preact bindings */

// TYPES ------------------------------------------
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: {
      connect: () => void
    }
  }
}

export type Listener<K> = (state: K, action?: Action<K>) => void
export type Unsubscribe = () => void
export type Action<K> = (state: K, ...args: any[]) => void
export type BoundAction = (...args: any[]) => void

export interface Store<K> {
  action(action: Action<K>): BoundAction
  setState<U extends keyof K>(
    update: Pick<K, U>,
    overwrite?: boolean,
    action?: Action<K>
  ): void
  subscribe(f: Listener<K>): Unsubscribe
  unsubscribe(f: Listener<K>): void
  getState(): K
}

export type ActionFn<K> = (
  state: K,
  ...args: any[]
) => Promise<Partial<K>> | Partial<K> | void

export interface ActionMap<K> {
  [actionName: string]: ActionFn<K>
}

export type ActionCreator<K> = (store: Store<K>) => ActionMap<K>

export type StateMapper<T, K, I> = (state: K, props: T) => I

// HELPER FNs ---------------------------------------------------------

// Bind an object/factory of actions to the store and wrap them.
function mapActions(actions, store) {
  if (typeof actions === 'function') actions = actions(store)
  const mapped = {}
  for (let i in actions) mapped[i] = store.action(actions[i])
  return mapped
}

// select('foo,bar') creates a function of the form: ({ foo, bar }) => ({ foo, bar })
function select(properties) {
  if (typeof properties === 'string') properties = properties.split(/\s*,\s*/)
  return state => {
    const selected = {}
    let i = properties.length
    while (i-- > 0) selected[properties[i]] = state[properties[i]]
    return selected
  }
}

// Lighter Object.assign stand-in
function assign(obj, props) {
  for (let i in props) obj[i] = props[i]
  return obj
}

const UnistoreContext = createContext(void 0)

/** Main provider */
const Provider = ({ store, children }) => {
  return (
    <UnistoreContext.Provider value={store}>
      {children}
    </UnistoreContext.Provider>
  )
}

function connect(mapStateToProps, actions) {
  if (typeof mapStateToProps != 'function') {
    mapStateToProps = select(mapStateToProps || {})
  }
  return Child => {
    function Wrapper(props) {
      const store = useContext(UnistoreContext)
      const [_, forceUpdate]: [any, Function] = useReducer(c => c + 1, 0)
      let state = mapStateToProps(store ? store.getState() : {}, props)
      const boundActions = actions ? mapActions(actions, store) : { store }

      let update = () => {
        let mapped = mapStateToProps(store ? store.getState() : {}, props)
        for (let i in mapped)
          if (mapped[i] !== state[i]) {
            state = mapped
            forceUpdate()
          }
        for (let i in state)
          if (!(i in mapped)) {
            state = mapped
            forceUpdate()
          }
      }

      useEffect(() => {
        store.subscribe(update)
        return () => {
          store.unsubscribe(update)
        }
      }, [])

      return h(Child, assign(assign(assign({}, boundActions), props), state))
    }

    return Wrapper
  }
}

function createStore<K>(state?: K): Store<K> {
  const listeners = []
  state = state || ({} as K)

  function unsubscribe(listener) {
    const i = listeners.lastIndexOf(listener)
    ~i && listeners.splice(i, 1)
  }

  function setState(update, overwrite, action) {
    state = overwrite ? update : assign(assign({}, state), update)
    let i = listeners.length
    while (i-- > 0) listeners[i](state, action)
  }

  /**
   * An observable state container, returned from {@link createStore}
   * @name store
   */

  return /** @lends store */ {
    /**
     * Create a bound copy of the given action function.
     * The bound returned function invokes action() and persists the result back to the store.
     * If the return value of `action` is a Promise, the resolved value will be used as state.
     * @param {Function} action	An action of the form `action(state, ...args) -> stateUpdate`
     * @returns {Function} boundAction()
     */
    action(action) {
      function apply(update) {
        setState(update, false, action)
      }

      // Note: perf tests verifying this implementation: https://esbench.com/bench/5a295e6299634800a0349500
      return function() {
        const args = [state]
        for (let i = 0; i < arguments.length; i++) args.push(arguments[i])
        const ret = action.apply(this, args)
        if (ret != null) {
          if (ret.then) return ret.then(apply)
          return apply(ret)
        }
      }
    },

    /**
     * Apply a partial state object to the current state, invoking registered listeners.
     * @param {Object} update				An object with properties to be merged into state
     * @param {Boolean} [overwrite=false]	If `true`, update will replace state instead of being merged into it
     */
    setState,

    /**
     * Register a listener function to be called whenever state is changed. Returns an `unsubscribe()` function.
     * @param {Function} listener	A function to call when state changes. Gets passed the new state.
     * @returns {Function} unsubscribe()
     */
    subscribe(listener) {
      listeners.push(listener)
      return () => {
        unsubscribe(listener)
      }
    },

    /**
     * Remove a previously-registered listener function.
     * @param {Function} listener	The callback previously passed to `subscribe()` that should be removed.
     * @function
     */
    unsubscribe,

    /**
     * Retrieve the current state object.
     * @returns {Object} state
     */
    getState() {
      return state
    }
  }
}

function unistoreDevTools(store) {
  const extension =
    window.__REDUX_DEVTOOLS_EXTENSION__ ||
    window.top.__REDUX_DEVTOOLS_EXTENSION__
  let ignoreState = false

  if (!extension) {
    console.warn('Please install/enable Redux devtools extension')
    store.devtools = null

    return store
  }

  if (!store.devtools) {
    store.devtools = extension.connect()
    store.devtools.subscribe(function(message) {
      if (message.type === 'DISPATCH' && message.state) {
        ignoreState =
          message.payload.type === 'JUMP_TO_ACTION' ||
          message.payload.type === 'JUMP_TO_STATE'
        store.setState(JSON.parse(message.state), true)
      }
    })
    store.devtools.init(store.getState())
    store.subscribe(function(state, action) {
      const actionName = (action && action.name) || 'setState'

      if (!ignoreState) {
        store.devtools.send(actionName, state)
      } else {
        ignoreState = false
      }
    })
  }

  return store
}

export { Provider, connect, createStore, unistoreDevTools }
