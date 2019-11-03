import { h, Fragment } from 'preact'

import { Link, Switch, Route } from 'wouter-preact'

import { connect } from '../unistore-bindings'

import { Page } from './Page'
import { Page2 } from './Page2'

const mapActionsToProps = {
  increment({ count }) {
    return {
      count: count + 1
    }
  },
  decrement({ count }) {
    return {
      count: count - 1
    }
  }
}

const Counter = connect(
  'count',
  mapActionsToProps
)(function Counter({ count, increment, decrement }) {
  return (
    <Fragment>
      <button
        onClick={_ => {
          increment()
        }}
      >
        ++
      </button>
      <button
        onClick={_ => {
          decrement()
        }}
      >
        --
      </button>
      <div>{count}</div>
    </Fragment>
  )
})

const App = () => {
  return (
    <div>
      <ul>
        <li>
          <Link to="/">ROOT</Link>
        </li>
        <li>
          <Link to="/2">Page2</Link>
        </li>
      </ul>

      <Counter />

      <Switch>
        <Route path="/" component={Page} />
        <Route path="/2" component={Page2} />
      </Switch>
    </div>
  )
}

export { App }
