import { h } from 'preact'
import { Request, Response } from 'express'
import render from 'preact-render-to-string'
import { Router } from 'wouter-preact'

import staticLocationHook from 'wouter-preact/static-location'

import { getHeader, getFooter } from './html-template'
import { App } from './App'

const renderer = (req: Request, res: Response) => {
  try {
    const body = render(
      <Router hook={staticLocationHook(req.path)}>
        <App />
      </Router>
    )
    const all = getHeader() + body + getFooter()

    res.send(all)
  } catch (error) {
    throw error
  }
}

export { renderer }
