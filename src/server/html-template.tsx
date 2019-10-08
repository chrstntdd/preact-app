import { readFileSync } from 'fs'

import { CLIENT_LIB } from '../paths'

const createScriptTag = (src: string) =>
  `<script type="module" src="${src}"></script>`

const makeHeader = () => {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <link rel="icon" href="data:,">
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <title>SSR!</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        *,
        *::after,
        *::before {
          box-sizing: border-box;
          -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
        }
        html * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        html,
        body {
          min-height: 100vh;
          min-width: 100vw;
          text-rendering: optimizeLegibility;
          font: 16px/1.8 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
            Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
            sans-serif;
          color: #444;
        }
      </style>
    </head>
    <body>
      <div id="root">`
}

let MANIFEST

const makeFooter = () => {
  MANIFEST =
    MANIFEST || JSON.parse(readFileSync(`${CLIENT_LIB}/manifest.json`, 'UTF-8'))
  return `</div>
    ${createScriptTag(MANIFEST.main)}
    </body>
  </html>
  `
}

export { makeHeader, makeFooter }
