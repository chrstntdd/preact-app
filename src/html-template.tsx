import path from 'path'

import { walkSync } from '@chrstntdd/node'

import { CLIENT_LIB } from './paths'

// Match main.asdf123.js in production mode or bundle.js in dev mode
const mainBundleRegex = /\main-\w+.mjs$/

let jsBundles: Set<string> = new Set([])
let cssFiles: string[] = []

try {
  for (const { name } of walkSync(CLIENT_LIB, {
    filter: fileName => fileName.endsWith('.mjs')
  })) {
    const relativePath = path.relative(process.cwd(), name)

    if (name.endsWith('.mjs')) {
      jsBundles.add(relativePath.replace('lib/', ''))
    }
  }
} catch (error) {
  console.log(error)
}

export const createScriptTag = (src: string) =>
  src ? `<script type="module" src="${src}"></script>` : ''

export const createLinkTag = (href: string) =>
  href ? `<link rel="stylesheet" href="${href}" />` : ''

const mainBundle = [...jsBundles].find(b => mainBundleRegex.test(b))

const getHeader = () => {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
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
      ${cssFiles.map(href => createLinkTag(href))}
    </head>
    <body>
      <div id="root">`
}

const getFooter = (bundles?: string[]) => {
  return `</div>
    ${createScriptTag(mainBundle)}
    ${bundles && bundles.length ? bundles.map(b => createScriptTag(b)).join('\n') : ''}
    </body>
  </html>
  `
}

export { getHeader, getFooter }
