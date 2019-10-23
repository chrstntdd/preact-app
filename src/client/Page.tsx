import { h } from 'preact'
import { useState, useEffect } from 'preact/hooks'

import { HeadTitle } from './Head'

let getCurrentTime = () => new Date().toLocaleString('en-US')

const Page = () => {
  const [s, sS] = useState(getCurrentTime)
  const [count, updateCount] = useState(0)

  useEffect(() => {
    let handle = setInterval(() => {
      sS(getCurrentTime)
    }, 1000)

    return () => {
      clearInterval(handle)
    }
  }, [])

  return (
    <div>
      A Page! The current time is: {s}
      Count: {count}
      <HeadTitle>Page{count}</HeadTitle>
      <button
        type="button"
        onClick={() => {
          updateCount(count + 1)
        }}
      >
        + Document title count
      </button>
      <button
        type="button"
        onClick={() => {
          updateCount(count - 1)
        }}
      >
        - Document title count
      </button>
    </div>
  )
}
export { Page }
