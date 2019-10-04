import { h } from 'preact'
import { useState, useEffect } from 'preact/hooks'

let getCurrentTime = () => new Date().toLocaleString('en-US')

const Page = () => {
  const [s, sS] = useState(getCurrentTime)

  useEffect(() => {
    let handle = setInterval(() => {
      sS(getCurrentTime)
    }, 1000)

    return () => {
      clearInterval(handle)
    }
  }, [])

  return <div>A Page! The current time is: {s}</div>
}
export { Page }
