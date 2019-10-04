import { h } from 'preact'

import { Link, Switch, Route } from 'wouter-preact'

import { Page } from './Page'
import { Page2 } from './Page2'

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

      <Switch>
        <Route path="/" component={Page} />
        <Route path="/2" component={Page2} />
      </Switch>
    </div>
  )
}

export { App }
